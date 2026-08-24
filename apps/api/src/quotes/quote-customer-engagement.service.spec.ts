import { describe, expect, it, jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { QuoteStatus } from '@prisma/client';
import type { PrismaService } from '../prisma.service';
import type { QuoteCustomerAccessService } from './quote-customer-access.service';
import {
  QUOTE_CUSTOMER_VIEW_SECURITY,
  QuoteCustomerEngagementService,
} from './quote-customer-engagement.service';

type SqlLike = { values?: unknown[] };

const CAPABILITY = 'A'.repeat(43);
const GRANT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const QUOTE_ID = '11111111-1111-4111-8111-111111111111';

function accessHarness(revisionNumber = 2) {
  return {
    resolve: jest.fn(async () => ({
      business: {},
      quote: {
        reference: 'Q-20260824-0001',
        revisionNumber,
        status: QuoteStatus.SUBMITTED,
        actionable: true,
        validUntil: new Date(Date.now() + 60_000).toISOString(),
        accessExpiresAt: new Date(Date.now() + 60_000).toISOString(),
        property: {}, request: {}, visit: {},
        pricing: { currency: 'ZAR', subtotalMinor: 100, discountMinor: 0, taxEnabled: false, taxMinor: 0, totalMinor: 100, lineItems: [] },
      },
    })),
  } as unknown as QuoteCustomerAccessService;
}

function grantIdentity() {
  return { id: GRANT_ID, quote_id: QUOTE_ID, revision_number: 2 };
}

function confirmationRow(overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  return {
    challenge_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    grant_id: GRANT_ID,
    quote_id: QUOTE_ID,
    revision_number: 2,
    issued_at: new Date(now - 5_000),
    challenge_expires_at: new Date(now + 60_000),
    confirmed_at: null,
    event_id: null,
    grant_expires_at: new Date(now + 60_000),
    revoked_at: null,
    superseded_at: null,
    quote_status: QuoteStatus.SUBMITTED,
    current_revision_number: 2,
    quote_valid_until: new Date(now + 60_000),
    ...overrides,
  };
}

describe('QuoteCustomerEngagementService challenge issuance', () => {
  it('issues a 256-bit opaque challenge and stores only its fingerprint', async () => {
    const executeCalls: SqlLike[] = [];
    const prisma = {
      $queryRaw: jest.fn(async () => [grantIdentity()]),
      $executeRaw: jest.fn(async (query: SqlLike) => { executeCalls.push(query); return 1; }),
    } as unknown as PrismaService;
    const service = new QuoteCustomerEngagementService(prisma, accessHarness());

    const result = await service.issueViewChallenge(CAPABILITY);

    expect(result.challenge).toMatch(QUOTE_CUSTOMER_VIEW_SECURITY.challengePattern);
    expect(result.minimumVisibleDwellMs).toBe(QUOTE_CUSTOMER_VIEW_SECURITY.minimumVisibleDwellMs);
    expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
    const values = executeCalls.flatMap((call) => call.values ?? []);
    expect(values).not.toContain(result.challenge);
    expect(values.some((value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value))).toBe(true);
  });

  it('rejects an unknown capability through the existing Slice B resolver', async () => {
    const access = accessHarness();
    (access.resolve as jest.Mock).mockRejectedValue(new NotFoundException('Quote access is unavailable.'));
    const prisma = {} as PrismaService;
    const service = new QuoteCustomerEngagementService(prisma, access);
    await expect(service.issueViewChallenge(CAPABILITY)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('QuoteCustomerEngagementService confirmation', () => {
  function confirmationHarness(rowOverrides: Record<string, unknown> = {}, existingEvent?: { id: string; occurred_at: Date }) {
    const txExecuteCalls: SqlLike[] = [];
    const tx = {
      $queryRaw: jest.fn(async () => {
        if ((tx.$queryRaw as jest.Mock).mock.calls.length === 1) return [confirmationRow(rowOverrides)];
        return existingEvent ? [existingEvent] : [];
      }),
      $executeRaw: jest.fn(async (query: SqlLike) => { txExecuteCalls.push(query); return 1; }),
    };
    const prisma = {
      $queryRaw: jest.fn(async () => [grantIdentity()]),
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    } as unknown as PrismaService;
    return { service: new QuoteCustomerEngagementService(prisma, accessHarness()), tx, txExecuteCalls };
  }

  it('does not confirm before the server-measured dwell threshold', async () => {
    const { service } = confirmationHarness({ issued_at: new Date() });
    await expect(service.confirmView(CAPABILITY, 'B'.repeat(43), true)).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates exactly one VIEW_CONFIRMED event after visible dwell', async () => {
    const { service, txExecuteCalls } = confirmationHarness();
    const result = await service.confirmView(CAPABILITY, 'B'.repeat(43), true);
    expect(result.eventType).toBe('VIEW_CONFIRMED');
    expect(result.replayed).toBe(false);
    expect(txExecuteCalls).toHaveLength(2);
  });

  it('replays an already-confirmed challenge without creating another event', async () => {
    const occurredAt = new Date(Date.now() - 1_000);
    const { service, txExecuteCalls } = confirmationHarness({
      confirmed_at: occurredAt,
      event_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    }, {
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      occurred_at: occurredAt,
    });
    const result = await service.confirmView(CAPABILITY, 'B'.repeat(43), true);
    expect(result).toEqual({ eventType: 'VIEW_CONFIRMED', occurredAt: occurredAt.toISOString(), replayed: true });
    expect(txExecuteCalls).toHaveLength(0);
  });

  it.each([
    ['challenge expired', { challenge_expires_at: new Date(Date.now() - 1) }],
    ['grant expired', { grant_expires_at: new Date(Date.now() - 1) }],
    ['grant revoked', { revoked_at: new Date() }],
    ['grant superseded', { superseded_at: new Date() }],
    ['Quote expired', { quote_valid_until: new Date(Date.now() - 1) }],
    ['stale revision', { current_revision_number: 3 }],
    ['unreadable Quote', { quote_status: QuoteStatus.EXPIRED }],
  ])('fails closed when %s', async (_name, overrides) => {
    const { service } = confirmationHarness(overrides);
    await expect(service.confirmView(CAPABILITY, 'B'.repeat(43), true)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('fails closed for the wrong challenge/grant pairing', async () => {
    const tx = { $queryRaw: jest.fn(async () => []), $executeRaw: jest.fn() };
    const prisma = {
      $queryRaw: jest.fn(async () => [grantIdentity()]),
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    } as unknown as PrismaService;
    const service = new QuoteCustomerEngagementService(prisma, accessHarness());
    await expect(service.confirmView(CAPABILITY, 'B'.repeat(43), true)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('QuoteCustomerEngagementService ADMIN projection', () => {
  it('derives first view, last view and count from append-only evidence', async () => {
    const first = new Date('2026-08-24T09:00:00.000Z');
    const last = new Date('2026-08-24T09:05:00.000Z');
    const prisma = {
      quote: { findUnique: jest.fn(async () => ({
        currentRevisionNumber: 2,
        validUntil: new Date(Date.now() + 60_000),
        status: QuoteStatus.SUBMITTED,
        revisions: [{ revisionNumber: 2 }],
      })) },
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{ id: GRANT_ID, revision_number: 2, expires_at: new Date(Date.now() + 60_000), revoked_at: null, superseded_at: null, created_at: new Date() }])
        .mockResolvedValueOnce([{ first_viewed_at: first, last_viewed_at: last, view_count: 2n }]),
    } as unknown as PrismaService;
    const service = new QuoteCustomerEngagementService(prisma, accessHarness());
    const summary = await service.engagementSummary(QUOTE_ID, 2);
    expect(summary).toEqual({
      revisionNumber: 2,
      accessState: 'ACTIVE',
      firstViewedAt: first.toISOString(),
      lastViewedAt: last.toISOString(),
      viewCount: 2,
    });
  });

  it('keeps the original first view while later evidence advances last view and count', async () => {
    const first = new Date('2026-08-24T09:00:00.000Z');
    const last = new Date('2026-08-24T09:10:00.000Z');
    const prisma = {
      quote: { findUnique: jest.fn(async () => ({ currentRevisionNumber: 2, validUntil: new Date(Date.now() + 60_000), status: QuoteStatus.SUBMITTED, revisions: [{ revisionNumber: 2 }] })) },
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{ id: GRANT_ID, revision_number: 2, expires_at: new Date(Date.now() + 60_000), revoked_at: null, superseded_at: null, created_at: new Date() }])
        .mockResolvedValueOnce([{ first_viewed_at: first, last_viewed_at: last, view_count: 3n }]),
    } as unknown as PrismaService;
    const service = new QuoteCustomerEngagementService(prisma, accessHarness());
    const summary = await service.engagementSummary(QUOTE_ID, 2);
    expect(summary.firstViewedAt).toBe(first.toISOString());
    expect(summary.lastViewedAt).toBe(last.toISOString());
    expect(summary.viewCount).toBe(3);
  });
});
