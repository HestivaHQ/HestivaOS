import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma, QuoteStatus } from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma.service';

const TOKEN_BYTES = 32;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const UNAVAILABLE_MESSAGE = 'Quote access is unavailable.';
const MAX_LIFETIME_ENV = 'HESTIVA_QUOTE_CUSTOMER_LINK_MAX_LIFETIME_SECONDS';

type GrantRow = {
  id: string;
  quote_id: string;
  revision_number: number;
  token_fingerprint: string;
  expires_at: Date;
  revoked_at: Date | null;
  superseded_at: Date | null;
  created_at: Date;
};

type StructuredQuoteData = {
  property?: Record<string, unknown>;
  request?: Record<string, unknown>;
  visit?: Record<string, unknown>;
};

type CustomerResponseDecision = 'CUSTOMER_ACCEPTED' | 'CUSTOMER_DECLINED';
export type QuoteCustomerResponseState =
  | 'NO_RESPONSE'
  | 'ACCEPTED_CONVERTED'
  | 'ACCEPTED_PENDING_INTERNAL_COMPLETION'
  | 'DECLINED';

export type IssueQuoteCustomerAccessInput = {
  quoteId: string;
  expectedRevisionNumber: number;
  actorUserId: string;
};

export type QuoteCustomerPublicProjection = {
  business: Record<string, string>;
  quote: {
    reference: string;
    revisionNumber: number;
    status: QuoteStatus;
    actionable: boolean;
    customerResponseState: QuoteCustomerResponseState;
    validUntil: string;
    accessExpiresAt: string;
    property: Record<string, unknown>;
    request: Record<string, unknown>;
    visit: Record<string, unknown>;
    pricing: {
      currency: string;
      subtotalMinor: number;
      discountMinor: number;
      taxEnabled: boolean;
      taxMinor: number;
      totalMinor: number;
      lineItems: Array<{
        type: string;
        label: string;
        description: string | null;
        quantity: number;
        unitAmountMinor: number;
        lineTotalMinor: number;
      }>;
    };
  };
};

function fingerprint(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

function configuredMaximumLifetimeMs(): number {
  const raw = process.env[MAX_LIFETIME_ENV]?.trim();
  if (!raw || !/^\d+$/.test(raw)) {
    throw new ServiceUnavailableException('Quote customer-link lifetime is not configured.');
  }
  const seconds = Number(raw);
  if (!Number.isSafeInteger(seconds) || seconds <= 0) {
    throw new ServiceUnavailableException('Quote customer-link lifetime configuration is invalid.');
  }
  return seconds * 1000;
}

function publicObject(source: Record<string, unknown> | undefined, keys: readonly string[]): Record<string, unknown> {
  if (!source) return {};
  return Object.fromEntries(keys.filter((key) => source[key] !== undefined).map((key) => [key, source[key]]));
}

function unavailable(): NotFoundException {
  return new NotFoundException(UNAVAILABLE_MESSAGE);
}

function isCustomerReadableQuoteStatus(status: QuoteStatus): boolean {
  switch (status) {
    case QuoteStatus.SUBMITTED:
    case QuoteStatus.ACCEPTED:
    case QuoteStatus.DECLINED:
      return true;
    default:
      return false;
  }
}

function customerResponseState(
  decision: CustomerResponseDecision | undefined,
  status: QuoteStatus,
): QuoteCustomerResponseState {
  if (!decision) return 'NO_RESPONSE';
  if (decision === 'CUSTOMER_DECLINED') {
    if (status === QuoteStatus.ACCEPTED) throw unavailable();
    return 'DECLINED';
  }
  if (status === QuoteStatus.DECLINED) throw unavailable();
  return status === QuoteStatus.ACCEPTED
    ? 'ACCEPTED_CONVERTED'
    : 'ACCEPTED_PENDING_INTERNAL_COMPLETION';
}

@Injectable()
export class QuoteCustomerAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async issue(input: IssueQuoteCustomerAccessInput) {
    const maximumLifetimeMs = configuredMaximumLifetimeMs();
    const now = new Date();
    const rawToken = randomBytes(TOKEN_BYTES).toString('base64url');
    const tokenFingerprint = fingerprint(rawToken);
    const newGrantId = randomUUID();

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        SELECT pg_advisory_xact_lock(hashtext(${`quote-customer-access:${input.quoteId}`}))
      `);

      const quote = await tx.quote.findUnique({
        where: { id: input.quoteId },
        select: {
          id: true,
          reference: true,
          status: true,
          currentRevisionNumber: true,
          validUntil: true,
          revisions: {
            where: { revisionNumber: input.expectedRevisionNumber },
            select: { id: true, revisionNumber: true },
            take: 1,
          },
        },
      });
      if (!quote) throw new NotFoundException('Quote not found.');
      if (quote.status !== QuoteStatus.SUBMITTED) {
        throw new ConflictException(`${quote.status} Quote cannot be issued as a customer offer.`);
      }
      if (quote.currentRevisionNumber !== input.expectedRevisionNumber || !quote.revisions[0]) {
        throw new ConflictException(`Quote changed. Current revision is ${quote.currentRevisionNumber}.`);
      }
      if (quote.validUntil.getTime() <= now.getTime()) throw new ConflictException('Expired Quote cannot be issued as a customer offer.');

      const expiresAt = new Date(Math.min(quote.validUntil.getTime(), now.getTime() + maximumLifetimeMs));
      const current = await tx.$queryRaw<GrantRow[]>(Prisma.sql`
        SELECT id, quote_id, revision_number, token_fingerprint, expires_at, revoked_at, superseded_at, created_at
        FROM quote_customer_access_grants
        WHERE quote_id = ${quote.id}::uuid
          AND revoked_at IS NULL
          AND superseded_at IS NULL
        LIMIT 1
        FOR UPDATE
      `);

      if (current[0]) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE quote_customer_access_grants
          SET superseded_at = ${now}, superseded_by_grant_id = ${newGrantId}::uuid, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${current[0].id}::uuid
            AND revoked_at IS NULL
            AND superseded_at IS NULL
        `);
      }

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO quote_customer_access_grants (
          id, quote_id, revision_number, token_fingerprint, expires_at, created_by_user_id, created_at, updated_at
        ) VALUES (
          ${newGrantId}::uuid,
          ${quote.id}::uuid,
          ${input.expectedRevisionNumber},
          ${tokenFingerprint},
          ${expiresAt},
          ${input.actorUserId}::uuid,
          ${now},
          ${now}
        )
      `);

      return {
        quoteReference: quote.reference,
        revisionNumber: input.expectedRevisionNumber,
        expiresAt,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return {
      token: rawToken,
      ...result,
    };
  }

  async revoke(quoteId: string, expectedRevisionNumber: number, actorUserId: string) {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        SELECT pg_advisory_xact_lock(hashtext(${`quote-customer-access:${quoteId}`}))
      `);
      const quote = await tx.quote.findUnique({ where: { id: quoteId }, select: { id: true, currentRevisionNumber: true } });
      if (!quote) throw new NotFoundException('Quote not found.');
      if (quote.currentRevisionNumber !== expectedRevisionNumber) {
        throw new ConflictException(`Quote changed. Current revision is ${quote.currentRevisionNumber}.`);
      }
      const changed = await tx.$executeRaw(Prisma.sql`
        UPDATE quote_customer_access_grants
        SET revoked_at = ${now}, revoked_by_user_id = ${actorUserId}::uuid, updated_at = CURRENT_TIMESTAMP
        WHERE quote_id = ${quoteId}::uuid
          AND revision_number = ${expectedRevisionNumber}
          AND revoked_at IS NULL
          AND superseded_at IS NULL
      `);
      return { revoked: changed > 0 };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async resolve(rawToken: string): Promise<QuoteCustomerPublicProjection> {
    if (!TOKEN_PATTERN.test(rawToken)) throw unavailable();
    const tokenFingerprint = fingerprint(rawToken);
    const rows = await this.prisma.$queryRaw<GrantRow[]>(Prisma.sql`
      SELECT id, quote_id, revision_number, token_fingerprint, expires_at, revoked_at, superseded_at, created_at
      FROM quote_customer_access_grants
      WHERE token_fingerprint = ${tokenFingerprint}
      LIMIT 1
    `);
    const grant = rows[0];
    const now = new Date();
    if (!grant || grant.revoked_at || grant.superseded_at || grant.expires_at.getTime() <= now.getTime()) throw unavailable();

    const quote = await this.prisma.quote.findUnique({
      where: { id: grant.quote_id },
      select: {
        reference: true,
        status: true,
        currentRevisionNumber: true,
        validUntil: true,
        revisions: {
          where: { revisionNumber: grant.revision_number },
          take: 1,
          select: {
            revisionNumber: true,
            structuredData: true,
            currency: true,
            subtotalMinor: true,
            discountMinor: true,
            taxEnabled: true,
            taxMinor: true,
            totalMinor: true,
            lineItems: {
              orderBy: { sortOrder: 'asc' },
              select: {
                type: true,
                label: true,
                description: true,
                quantity: true,
                unitAmountMinor: true,
                lineTotalMinor: true,
              },
            },
          },
        },
      },
    });
    const revision = quote?.revisions[0];
    if (!quote || !revision) throw unavailable();
    if (quote.currentRevisionNumber !== grant.revision_number) throw unavailable();
    if (quote.validUntil.getTime() <= now.getTime()) throw unavailable();
    if (!isCustomerReadableQuoteStatus(quote.status)) throw unavailable();

    const responseRows = await this.prisma.$queryRaw<Array<{ decision: CustomerResponseDecision }>>(Prisma.sql`
      SELECT decision::text AS decision
      FROM quote_customer_responses
      WHERE grant_id = ${grant.id}::uuid
        AND quote_id = ${grant.quote_id}::uuid
        AND revision_number = ${grant.revision_number}
      ORDER BY created_at ASC
      LIMIT 1
    `);
    const responseState = customerResponseState(responseRows[0]?.decision, quote.status);

    const structured = revision.structuredData as StructuredQuoteData;
    const profile = await this.prisma.businessProfile.findUnique({ where: { id: 'hestiva' } });
    const business: Record<string, string> = {};
    if (profile?.shareTradingName && profile.tradingName) business.tradingName = profile.tradingName;
    if (profile?.shareRegisteredName && profile.registeredName) business.registeredName = profile.registeredName;
    if (profile?.shareRegistrationNumber && profile.registrationNumber) business.registrationNumber = profile.registrationNumber;
    if (profile?.shareContactNumber && profile.contactNumber) business.contactNumber = profile.contactNumber;
    if (profile?.shareBusinessEmail && profile.businessEmail) business.businessEmail = profile.businessEmail;
    if (profile?.shareWebsite && profile.website) business.website = profile.website;

    return {
      business,
      quote: {
        reference: quote.reference,
        revisionNumber: revision.revisionNumber,
        status: quote.status,
        actionable: quote.status === QuoteStatus.SUBMITTED && responseState === 'NO_RESPONSE',
        customerResponseState: responseState,
        validUntil: quote.validUntil.toISOString(),
        accessExpiresAt: grant.expires_at.toISOString(),
        property: publicObject(structured.property, ['propertyType', 'suburb', 'floorSize', 'bedrooms', 'bathrooms', 'livingAreas', 'storeys', 'outdoorArea']),
        request: publicObject(structured.request, ['primaryService', 'frequency', 'customFrequencyNote', 'homeCondition', 'addOns', 'ecoFriendlyProducts', 'laundry', 'postEvent']),
        visit: publicObject(structured.visit, ['preferredDate', 'alternativeDate', 'preferredTime', 'flexibility', 'urgency', 'recurringNotes']),
        pricing: {
          currency: revision.currency,
          subtotalMinor: revision.subtotalMinor,
          discountMinor: revision.discountMinor,
          taxEnabled: revision.taxEnabled,
          taxMinor: revision.taxMinor,
          totalMinor: revision.totalMinor,
          lineItems: revision.lineItems.map((item) => ({
            type: item.type,
            label: item.label,
            description: item.description,
            quantity: item.quantity,
            unitAmountMinor: item.unitAmountMinor,
            lineTotalMinor: item.lineTotalMinor,
          })),
        },
      },
    };
  }
}

export const QUOTE_CUSTOMER_ACCESS_SECURITY = {
  tokenBytes: TOKEN_BYTES,
  tokenPattern: TOKEN_PATTERN,
  maximumLifetimeEnv: MAX_LIFETIME_ENV,
  unavailableMessage: UNAVAILABLE_MESSAGE,
} as const;
