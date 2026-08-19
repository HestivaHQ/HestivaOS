import { describe, expect, it } from '@jest/globals';
import {
  AttentionPriority,
  TemporaryAccessCredentialReviewStatus,
  WorkOrderAccessReadiness,
} from '@prisma/client';
import {
  accessAttentionPriority,
  isAccessOperationallyResolved,
  isTemporaryAccessCredentialUsable,
} from './access-operations-policy';

const now = new Date('2026-08-19T08:00:00.000Z');
const at = (hours: number) => new Date(now.getTime() + hours * 60 * 60 * 1000);
const accepted = (overrides = {}) => ({
  reviewStatus: TemporaryAccessCredentialReviewStatus.ACCEPTED,
  validFrom: null,
  expiresAt: null,
  revokedAt: null,
  ...overrides,
});

describe('Phase 3C access operations policy', () => {
  it.each([
    [24.01, AttentionPriority.NORMAL],
    [24, AttentionPriority.HIGH],
    [4, AttentionPriority.HIGH],
    [3.99, AttentionPriority.CRITICAL],
    [0, AttentionPriority.CRITICAL],
    [-1, AttentionPriority.CRITICAL],
  ])('derives priority at %s hours from the appointment', (hours, expected) => {
    expect(accessAttentionPriority(at(hours as number), now)).toBe(expected);
  });

  it('is deterministic and restart-safe because only persisted schedule and the supplied clock are inputs', () => {
    expect(accessAttentionPriority(at(3), now)).toBe(accessAttentionPriority(at(3), now));
  });

  it('accepts only reviewed credentials inside their validity interval', () => {
    expect(isTemporaryAccessCredentialUsable(accepted(), now)).toBe(true);
    expect(isTemporaryAccessCredentialUsable(accepted({ expiresAt: now }), now)).toBe(false);
    expect(isTemporaryAccessCredentialUsable(accepted({ revokedAt: now }), now)).toBe(false);
    expect(isTemporaryAccessCredentialUsable(accepted({ validFrom: at(1) }), now)).toBe(false);
    expect(isTemporaryAccessCredentialUsable(accepted({ reviewStatus: TemporaryAccessCredentialReviewStatus.REJECTED }), now)).toBe(false);
  });

  it('resolves without credential storage when access is arranged another way', () => {
    expect(isAccessOperationallyResolved(WorkOrderAccessReadiness.ARRANGED_ANOTHER_WAY, [], now)).toBe(true);
  });

  it('does not represent RECEIVED as resolved when every credential is unusable', () => {
    expect(isAccessOperationallyResolved(WorkOrderAccessReadiness.RECEIVED, [accepted({ expiresAt: now })], now)).toBe(false);
    expect(isAccessOperationallyResolved(WorkOrderAccessReadiness.RECEIVED, [accepted()], now)).toBe(true);
  });
});
