import { describe, expect, it, afterEach, jest } from '@jest/globals';
import { ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { QuoteStatus } from '@prisma/client';
import type { PrismaService } from '../prisma.service';
import {
  QUOTE_CUSTOMER_ACCESS_SECURITY,
  QuoteCustomerAccessService,
} from './quote-customer-access.service';

const ENV = QUOTE_CUSTOMER_ACCESS_SECURITY.maximumLifetimeEnv;

type SqlLike = { values?: unknown[] };
type ResponseDecision = 'CUSTOMER_ACCEPTED' | 'CUSTOMER_DECLINED' | null;

afterEach(() => {
  delete process.env[ENV];
  jest.restoreAllMocks();
});

function issuanceHarness(validUntil: Date, revisionNumber = 2, withActionableGrant = false) {
  const executeCalls: SqlLike[] = [];
  const existingGrant = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    quote_id: '11111111-1111-4111-8111-111111111111',
    revision_number: revisionNumber,
    token_fingerprint: 'f'.repeat(64),
    expires_at: validUntil,
    revoked_at: null,
    superseded_at: null,
    created_at: new Date(),
  };
  const tx = {
    $executeRaw: jest.fn(async (query: SqlLike) => { executeCalls.push(query); return 1; }),
    $queryRaw: jest.fn(async () => withActionableGrant ? [existingGrant] : []),
    quote: {
      findUnique: jest.fn(async () => ({
        id: '11111111-1111-4111-8111-111111111111',
        reference: 'Q-20260824-0001',
        status: QuoteStatus.SUBMITTED,
        currentRevisionNumber: revisionNumber,
        validUntil,
        revisions: [{ id: '22222222-2222-4222-8222-222222222222', revisionNumber }],
      })),
    },
  };
  const prisma = {
    $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
  } as unknown as PrismaService;
  return { service: new QuoteCustomerAccessService(prisma), executeCalls, tx };
}

function flattenValues(calls: SqlLike[]): unknown[] {
  return calls.flatMap((call) => call.values ?? []);
}

describe('QuoteCustomerAccessService issuance', () => {
  it('generates at least 256 bits of opaque entropy and persists only its SHA-256 fingerprint', async () => {
    process.env[ENV] = '3600';
    const { service, executeCalls } = issuanceHarness(new Date(Date.now() + 86_400_000));
    const result = await service.issue({
      quoteId: '11111111-1111-4111-8111-111111111111',
      expectedRevisionNumber: 2,
      actorUserId: '33333333-3333-4333-8333-333333333333',
    });

    expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const persisted = flattenValues(executeCalls);
    expect(persisted).not.toContain(result.token);
    const fingerprints = persisted.filter((value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value));
    expect(fingerprints).toHaveLength(1);
    expect(result.token).not.toContain('11111111');
  });

  it('uses the Quote validity when it expires before the configured maximum', async () => {
    process.env[ENV] = '86400';
    const validUntil = new Date(Date.now() + 60_000);
    const { service } = issuanceHarness(validUntil);
    const result = await service.issue({ quoteId: '11111111-1111-4111-8111-111111111111', expectedRevisionNumber: 2, actorUserId: '33333333-3333-4333-8333-333333333333' });
    expect(result.expiresAt.toISOString()).toBe(validUntil.toISOString());
  });

  it('uses the configured maximum when it expires before Quote validity', async () => {
    process.env[ENV] = '60';
    const before = Date.now();
    const { service } = issuanceHarness(new Date(before + 86_400_000));
    const result = await service.issue({ quoteId: '11111111-1111-4111-8111-111111111111', expectedRevisionNumber: 2, actorUserId: '33333333-3333-4333-8333-333333333333' });
    expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 59_000);
    expect(result.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 61_000);
  });

  it('fails closed instead of inventing a maximum lifetime default', async () => {
    const { service } = issuanceHarness(new Date(Date.now() + 86_400_000));
    await expect(service.issue({ quoteId: '11111111-1111-4111-8111-111111111111', expectedRevisionNumber: 2, actorUserId: '33333333-3333-4333-8333-333333333333' })).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejects issuance against a stale revision', async () => {
    process.env[ENV] = '3600';
    const { service } = issuanceHarness(new Date(Date.now() + 86_400_000), 3);
    await expect(service.issue({ quoteId: '11111111-1111-4111-8111-111111111111', expectedRevisionNumber: 2, actorUserId: '33333333-3333-4333-8333-333333333333' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('rotates a repeated issuance by superseding the existing unresolved grant before inserting its successor', async () => {
    process.env[ENV] = '3600';
    const { service, executeCalls } = issuanceHarness(new Date(Date.now() + 86_400_000), 2, true);
    const result = await service.issue({ quoteId: '11111111-1111-4111-8111-111111111111', expectedRevisionNumber: 2, actorUserId: '33333333-3333-4333-8333-333333333333' });

    expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(executeCalls).toHaveLength(3);
    const values = flattenValues(executeCalls);
    expect(values).toContain('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(values).not.toContain(result.token);
  });
});

describe('QuoteCustomerAccessService resolution', () => {
  function resolutionHarness(
    grantOverrides: Record<string, unknown> = {},
    quoteOverrides: Record<string, unknown> = {},
    responseDecision: ResponseDecision = null,
  ) {
    const now = Date.now();
    const grant = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      quote_id: '11111111-1111-4111-8111-111111111111',
      revision_number: 2,
      token_fingerprint: 'unused',
      expires_at: new Date(now + 60_000),
      revoked_at: null,
      superseded_at: null,
      created_at: new Date(),
      ...grantOverrides,
    };
    const quote = {
      reference: 'Q-20260824-0001',
      status: QuoteStatus.SUBMITTED,
      currentRevisionNumber: 2,
      validUntil: new Date(now + 120_000),
      revisions: [{
        revisionNumber: 2,
        structuredData: {
          customer: { fullName: 'Private Customer', email: 'private@example.com', mobile: '+27111111111' },
          property: { propertyType: 'HOUSE', addressLine1: 'Private street', suburb: 'Orange Farm', floorSize: 'FROM_80_TO_150', bedrooms: 'THREE', bathrooms: 'TWO', livingAreas: 'ONE', securityInstructions: 'Private gate code' },
          request: { primaryService: { canonicalService: 'Deep Cleaning' }, frequency: 'ONE_TIME', homeCondition: 'STANDARD', internalCost: 1 },
          visit: { preferredDate: '2026-08-30', preferredTime: 'MORNING', flexibility: 'FLEXIBLE', urgency: 'STANDARD' },
          safety: { allergiesOrSensitivities: 'Private' },
          notes: { additionalNotes: 'Private internal-like note' },
        },
        currency: 'ZAR',
        subtotalMinor: 125000,
        discountMinor: 5000,
        taxEnabled: false,
        taxMinor: 0,
        totalMinor: 120000,
        lineItems: [{ type: 'PRIMARY_SERVICE', label: 'Deep Cleaning', description: null, quantity: 1, unitAmountMinor: 125000, lineTotalMinor: 125000 }],
      }],
      ...quoteOverrides,
    };
    const queryCalls: SqlLike[] = [];
    let queryNumber = 0;
    const prisma = {
      $queryRaw: jest.fn(async (query: SqlLike) => {
        queryCalls.push(query);
        queryNumber += 1;
        if (queryNumber === 1) return [grant];
        return responseDecision ? [{ decision: responseDecision }] : [];
      }),
      quote: { findUnique: jest.fn(async () => quote) },
      businessProfile: { findUnique: jest.fn(async () => ({ tradingName: 'Homent', shareTradingName: true, registeredName: 'Hestiva (Pty) Ltd', shareRegisteredName: false, registrationNumber: null, shareRegistrationNumber: true, contactNumber: '0100000000', shareContactNumber: true, businessEmail: 'hello@example.com', shareBusinessEmail: true, website: 'https://example.com', shareWebsite: true })) },
    } as unknown as PrismaService;
    return { service: new QuoteCustomerAccessService(prisma), queryCalls };
  }

  const validToken = 'A'.repeat(43);

  it('returns only the exact revision stored projection and stored pricing', async () => {
    const { service } = resolutionHarness();
    const projection = await service.resolve(validToken);
    expect(projection.quote.revisionNumber).toBe(2);
    expect(projection.quote.pricing.totalMinor).toBe(120000);
    expect(projection.quote.pricing.lineItems[0].label).toBe('Deep Cleaning');
    expect(projection.quote.property.suburb).toBe('Orange Farm');
    expect(projection.quote.property).not.toHaveProperty('addressLine1');
    expect(projection.quote.customerResponseState).toBe('NO_RESPONSE');
    expect(projection.quote.actionable).toBe(true);
    expect(JSON.stringify(projection)).not.toContain('private@example.com');
    expect(JSON.stringify(projection)).not.toContain('Private street');
    expect(JSON.stringify(projection)).not.toContain('internalCost');
    expect(JSON.stringify(projection)).not.toContain('event_id');
    expect(JSON.stringify(projection)).not.toContain('systemActor');
    expect(projection.business).not.toHaveProperty('registeredName');
  });

  it('reconstructs accepted-and-converted state from exact response evidence plus canonical acceptance', async () => {
    const { service } = resolutionHarness({}, { status: QuoteStatus.ACCEPTED }, 'CUSTOMER_ACCEPTED');
    const projection = await service.resolve(validToken);
    expect(projection.quote.customerResponseState).toBe('ACCEPTED_CONVERTED');
    expect(projection.quote.actionable).toBe(false);
  });

  it('reconstructs durable pending acceptance while canonical Quote remains submitted', async () => {
    const { service } = resolutionHarness({}, {}, 'CUSTOMER_ACCEPTED');
    const projection = await service.resolve(validToken);
    expect(projection.quote.customerResponseState).toBe('ACCEPTED_PENDING_INTERNAL_COMPLETION');
    expect(projection.quote.actionable).toBe(false);
  });

  it('reconstructs durable decline and hides actions even if canonical decline recovery is still pending', async () => {
    const { service } = resolutionHarness({}, {}, 'CUSTOMER_DECLINED');
    const projection = await service.resolve(validToken);
    expect(projection.quote.customerResponseState).toBe('DECLINED');
    expect(projection.quote.actionable).toBe(false);
  });

  it('binds response lookup to the resolved grant, Quote and exact revision', async () => {
    const { service, queryCalls } = resolutionHarness({}, {}, 'CUSTOMER_ACCEPTED');
    await service.resolve(validToken);
    const responseLookupValues = queryCalls[1]?.values ?? [];
    expect(responseLookupValues).toContain('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(responseLookupValues).toContain('11111111-1111-4111-8111-111111111111');
    expect(responseLookupValues).toContain(2);
  });

  it('fails closed on response/canonical-state contradictions', async () => {
    const { service } = resolutionHarness({}, { status: QuoteStatus.DECLINED }, 'CUSTOMER_ACCEPTED');
    await expect(service.resolve(validToken)).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each([QuoteStatus.ACCEPTED, QuoteStatus.DECLINED])('keeps terminal %s Quotes readable but non-actionable while the exact grant remains valid', async (status) => {
    const { service } = resolutionHarness({}, { status });
    const projection = await service.resolve(validToken);
    expect(projection.quote.status).toBe(status);
    expect(projection.quote.actionable).toBe(false);
  });

  it.each([QuoteStatus.NEEDS_ATTENTION, QuoteStatus.EXPIRED])('fails closed for non-customer-readable canonical status %s', async (status) => {
    const { service } = resolutionHarness({}, { status });
    await expect(service.resolve(validToken)).rejects.toMatchObject({
      response: { message: QUOTE_CUSTOMER_ACCESS_SECURITY.unavailableMessage },
    });
  });

  it.each([
    ['expired grant', { expires_at: new Date(Date.now() - 1) }],
    ['revoked grant', { revoked_at: new Date() }],
    ['superseded grant', { superseded_at: new Date() }],
  ])('rejects a %s with the same safe public error', async (_name, overrides) => {
    const { service } = resolutionHarness(overrides);
    await expect(service.resolve(validToken)).rejects.toMatchObject({
      response: { message: QUOTE_CUSTOMER_ACCESS_SECURITY.unavailableMessage },
    });
  });

  it('rejects an old revision instead of exposing the newer current revision or its response', async () => {
    const { service } = resolutionHarness({}, { currentRevisionNumber: 3 }, 'CUSTOMER_ACCEPTED');
    await expect(service.resolve(validToken)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects when the canonical Quote expires before the access grant', async () => {
    const { service } = resolutionHarness({}, { validUntil: new Date(Date.now() - 1) });
    await expect(service.resolve(validToken)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('uses the same safe public failure for malformed and unknown tokens', async () => {
    const { service } = resolutionHarness();
    await expect(service.resolve('not-a-capability')).rejects.toMatchObject({ response: { message: QUOTE_CUSTOMER_ACCESS_SECURITY.unavailableMessage } });
    const unknownPrisma = {
      $queryRaw: jest.fn(async () => []),
    } as unknown as PrismaService;
    await expect(new QuoteCustomerAccessService(unknownPrisma).resolve(validToken)).rejects.toMatchObject({ response: { message: QUOTE_CUSTOMER_ACCESS_SECURITY.unavailableMessage } });
  });
});
