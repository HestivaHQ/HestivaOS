import { ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { CorrespondenceDeliveryAttemptStatus, CorrespondenceTemplateVersionStatus, Prisma, QuoteStatus, User } from '@prisma/client';
import { CorrespondenceService } from '../correspondence/correspondence.service';
import { ResendEmailTransport } from '../correspondence/resend-email.transport';
import { PrismaService } from '../prisma.service';
import { QuoteCustomerAccessService } from './quote-customer-access.service';
import { QuoteCustomerEngagementService } from './quote-customer-engagement.service';
import { QuoteCustomerResponseService } from './quote-customer-response.service';

const QUOTE_TEMPLATE_KEY = 'quote_customer_ready_v1';
const SECURE_LINK_MARKER = '{{SECURE_QUOTE_LINK}}';
const WHATSAPP_COMPOSER_OPENED = 'WHATSAPP_COMPOSER_OPENED';

type ContactSnapshot = { name: string; email: string | null; phone: string | null };

function publicOrigin(): string {
  const configured = process.env.HESTIVA_QUOTE_CUSTOMER_PUBLIC_ORIGIN?.trim();
  if (!configured) throw new ServiceUnavailableException('HESTIVA_QUOTE_CUSTOMER_PUBLIC_ORIGIN is not configured.');
  let url: URL;
  try { url = new URL(configured); }
  catch { throw new ServiceUnavailableException('HESTIVA_QUOTE_CUSTOMER_PUBLIC_ORIGIN is invalid.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new ServiceUnavailableException('HESTIVA_QUOTE_CUSTOMER_PUBLIC_ORIGIN must be an HTTPS origin only.');
  }
  return url.origin;
}

function field(source: unknown, key: string): string | null {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
  const value = (source as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function fallbackContact(structuredData: Prisma.JsonValue): ContactSnapshot {
  const root = structuredData && typeof structuredData === 'object' && !Array.isArray(structuredData) ? structuredData as Record<string, unknown> : {};
  const customer = root.customer;
  return {
    name: field(customer, 'name') ?? field(customer, 'fullName') ?? field(customer, 'contactName') ?? 'Customer',
    email: field(customer, 'email'),
    phone: field(customer, 'mobile') ?? field(customer, 'phone'),
  };
}

function whatsappNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length >= 10) return `27${digits.slice(1)}`;
  if (digits.length >= 7 && digits.length <= 15) return digits;
  throw new ConflictException('Customer mobile number is not valid for WhatsApp click-to-chat.');
}

@Injectable()
export class QuoteSendShareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: QuoteCustomerAccessService,
    private readonly engagement: QuoteCustomerEngagementService,
    private readonly responses: QuoteCustomerResponseService,
    private readonly correspondence: CorrespondenceService,
    private readonly email: ResendEmailTransport,
  ) {}

  private async quoteContext(quoteId: string, expectedRevisionNumber: number) {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      select: {
        id: true, reference: true, status: true, currentRevisionNumber: true,
        customer: { select: { name: true, contactName: true, email: true, phone: true } },
        revisions: { where: { revisionNumber: expectedRevisionNumber }, take: 1, select: { structuredData: true } },
      },
    });
    if (!quote) throw new NotFoundException('Quote not found.');
    if (quote.currentRevisionNumber !== expectedRevisionNumber || !quote.revisions[0]) throw new ConflictException(`Quote changed. Current revision is ${quote.currentRevisionNumber}.`);
    if (quote.status !== QuoteStatus.SUBMITTED) throw new ConflictException(`${quote.status} Quote cannot be sent as a customer offer.`);
    const fallback = fallbackContact(quote.revisions[0].structuredData);
    return {
      ...quote,
      contact: {
        name: quote.customer?.contactName?.trim() || quote.customer?.name?.trim() || fallback.name,
        email: quote.customer?.email?.trim() || fallback.email,
        phone: quote.customer?.phone?.trim() || fallback.phone,
      } satisfies ContactSnapshot,
    };
  }

  private async secureLink(quoteId: string, expectedRevisionNumber: number, actor: User) {
    const grant = await this.access.issue({ quoteId, expectedRevisionNumber, actorUserId: actor.id });
    return { ...grant, url: `${publicOrigin()}/quote#${grant.token}` };
  }

  private async assertNoUnreconciledEmailAttempt(quoteId: string, expectedRevisionNumber: number) {
    const rows = await this.prisma.$queryRaw<Array<{ attempt_id: string }>>(Prisma.sql`
      SELECT a.id AS attempt_id
      FROM correspondence_records r
      JOIN correspondence_delivery_attempts a ON a.correspondence_record_id = r.id
      WHERE r.provenance->>'purpose' = 'QUOTE'
        AND r.provenance->>'quoteId' = ${quoteId}
        AND r.provenance->>'revisionNumber' = ${String(expectedRevisionNumber)}
        AND a.route_snapshot->>'provider' = 'RESEND'
        AND EXISTS (
          SELECT 1 FROM correspondence_delivery_attempt_events e
          WHERE e.attempt_id = a.id AND e.status = 'PENDING'::"CorrespondenceDeliveryAttemptStatus"
        )
        AND NOT EXISTS (
          SELECT 1 FROM correspondence_delivery_attempt_events e
          WHERE e.attempt_id = a.id AND e.status IN ('ACCEPTED', 'FAILED')
        )
        AND NOT EXISTS (
          SELECT 1 FROM correspondence_provider_events pe WHERE pe.attempt_id = a.id
        )
      ORDER BY a.created_at DESC
      LIMIT 1
    `);
    if (rows[0]) throw new ConflictException('The previous Quote email outcome is still uncertain. Reconcile it before resending.');
  }

  async openWhatsApp(quoteId: string, expectedRevisionNumber: number, actor: User) {
    const quote = await this.quoteContext(quoteId, expectedRevisionNumber);
    if (!quote.contact.phone) throw new ConflictException('Customer mobile number is not available.');
    const link = await this.secureLink(quoteId, expectedRevisionNumber, actor);
    const text = `Hello ${quote.contact.name}, your Homent Quote ${quote.reference} is ready to review: ${link.url}`;
    const composerUrl = `https://wa.me/${whatsappNumber(quote.contact.phone)}?text=${encodeURIComponent(text)}`;
    const occurredAt = new Date();
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO quote_activities (id, quote_id, type, metadata, actor_user_id, created_at)
      VALUES (
        gen_random_uuid(), ${quoteId}::uuid, ${WHATSAPP_COMPOSER_OPENED}::"QuoteActivityType",
        ${JSON.stringify({ revisionNumber: expectedRevisionNumber, channel: 'WHATSAPP', evidence: 'COMPOSER_OPENED_ONLY' })}::jsonb,
        ${actor.id}::uuid, ${occurredAt}
      )
    `);
    return { composerUrl, revisionNumber: expectedRevisionNumber, evidence: WHATSAPP_COMPOSER_OPENED, occurredAt: occurredAt.toISOString() };
  }

  async sendEmail(quoteId: string, expectedRevisionNumber: number, actor: User) {
    const quote = await this.quoteContext(quoteId, expectedRevisionNumber);
    if (!quote.contact.email) throw new ConflictException('Customer email address is not available.');
    const version = await this.prisma.correspondenceTemplateVersion.findFirst({
      where: { template: { key: QUOTE_TEMPLATE_KEY }, status: CorrespondenceTemplateVersionStatus.PUBLISHED },
      orderBy: { version: 'desc' }, select: { id: true },
    });
    if (!version) throw new ServiceUnavailableException('Published Quote correspondence template is not available.');
    this.email.assertConfigured('QUOTE');
    publicOrigin();
    await this.assertNoUnreconciledEmailAttempt(quoteId, expectedRevisionNumber);

    const record = await this.correspondence.materialize(actor, {
      templateVersionId: version.id,
      recipientSnapshot: { purpose: 'QUOTE', email: quote.contact.email, displayName: quote.contact.name },
      provenance: { purpose: 'QUOTE', quoteId, revisionNumber: expectedRevisionNumber, secureLinkInjectedAtTransport: true },
    });
    const link = await this.secureLink(quoteId, expectedRevisionNumber, actor);
    const attempt = await this.correspondence.createDeliveryAttempt(actor, record.id, {
      routeSnapshot: { provider: 'RESEND', channel: 'EMAIL', purpose: 'QUOTE', recipient: quote.contact.email },
    });
    const subject = record.subject ?? 'Your Homent Quote is ready';
    const safeBody = record.body.includes(SECURE_LINK_MARKER) ? record.body : `${record.body}\n\n${SECURE_LINK_MARKER}`;
    const result = await this.email.send({
      purpose: 'QUOTE', to: quote.contact.email, subject,
      text: safeBody.replaceAll(SECURE_LINK_MARKER, link.url),
      idempotencyKey: `correspondence-attempt/${attempt.id}`,
      correspondenceAttemptId: attempt.id,
    });

    if (result.outcome === 'ACCEPTED') {
      await this.correspondence.recordDeliveryOutcome(actor, attempt.id, {
        status: CorrespondenceDeliveryAttemptStatus.ACCEPTED,
        providerReference: result.providerReference,
        metadata: { provider: 'RESEND', semantics: 'PROVIDER_ACCEPTED_NOT_DELIVERED_OR_VIEWED' },
      });
      return { revisionNumber: expectedRevisionNumber, correspondenceRecordId: record.id, attemptId: attempt.id, state: 'PROVIDER_ACCEPTED' };
    }
    if (result.outcome === 'REJECTED') {
      await this.correspondence.recordDeliveryOutcome(actor, attempt.id, {
        status: CorrespondenceDeliveryAttemptStatus.FAILED,
        failureCode: result.code, failureMessage: result.message,
        metadata: { provider: 'RESEND', semantics: 'PROVIDER_REJECTED' },
      });
      return { revisionNumber: expectedRevisionNumber, correspondenceRecordId: record.id, attemptId: attempt.id, state: 'PROVIDER_FAILED' };
    }
    return { revisionNumber: expectedRevisionNumber, correspondenceRecordId: record.id, attemptId: attempt.id, state: 'PENDING_RECONCILIATION' };
  }

  async tracking(quoteId: string, expectedRevisionNumber: number) {
    const engagement = await this.engagement.engagementSummary(quoteId, expectedRevisionNumber);
    const response = await this.responses.summary(quoteId, expectedRevisionNumber);
    const emailRows = await this.prisma.$queryRaw<Array<{
      record_id: string; attempt_id: string; attempt_number: number; attempt_created_at: Date; attempt_status: string; provider_reference: string | null;
      event_type: string | null; provider_occurred_at: Date | null;
    }>>(Prisma.sql`
      SELECT r.id AS record_id, a.id AS attempt_id, a.attempt_number, a.created_at AS attempt_created_at,
        COALESCE((SELECT e.status::text FROM correspondence_delivery_attempt_events e WHERE e.attempt_id = a.id ORDER BY e.created_at DESC LIMIT 1), 'PENDING') AS attempt_status,
        (SELECT e.provider_reference FROM correspondence_delivery_attempt_events e WHERE e.attempt_id = a.id AND e.provider_reference IS NOT NULL ORDER BY e.created_at DESC LIMIT 1) AS provider_reference,
        pe.event_type, pe.occurred_at AS provider_occurred_at
      FROM correspondence_records r
      JOIN correspondence_delivery_attempts a ON a.correspondence_record_id = r.id
      LEFT JOIN correspondence_provider_events pe ON pe.attempt_id = a.id
      WHERE r.provenance->>'purpose' = 'QUOTE'
        AND r.provenance->>'quoteId' = ${quoteId}
        AND r.provenance->>'revisionNumber' = ${String(expectedRevisionNumber)}
      ORDER BY a.created_at DESC, pe.occurred_at ASC
    `);
    const whatsapp = await this.prisma.$queryRaw<Array<{ created_at: Date; metadata: Prisma.JsonValue }>>(Prisma.sql`
      SELECT created_at, metadata FROM quote_activities
      WHERE quote_id = ${quoteId}::uuid AND type = ${WHATSAPP_COMPOSER_OPENED}::"QuoteActivityType"
        AND metadata->>'revisionNumber' = ${String(expectedRevisionNumber)}
      ORDER BY created_at DESC LIMIT 20
    `);
    return {
      revisionNumber: expectedRevisionNumber,
      access: engagement,
      response: response.response,
      email: emailRows.map((row) => ({ ...row, attempt_created_at: row.attempt_created_at.toISOString(), provider_occurred_at: row.provider_occurred_at?.toISOString() ?? null })),
      whatsappComposerOpened: whatsapp.map((event) => ({ occurredAt: event.created_at.toISOString(), metadata: event.metadata })),
    };
  }
}

export const QUOTE_SEND_SHARE_CONTRACT = { quoteTemplateKey: QUOTE_TEMPLATE_KEY, secureLinkMarker: SECURE_LINK_MARKER } as const;
