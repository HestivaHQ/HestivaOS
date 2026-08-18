import { describe, expect, it } from '@jest/globals';
import { validateScopeMismatchResolution } from './work-order-scope-mismatch.policy';

describe('scope mismatch resolution policy', () => {
  it('keeps non-chargeable differences lightweight', () => {
    expect(validateScopeMismatchResolution({ resolution: 'NON_CHARGEABLE_ADJUSTMENT', note: 'Small factual adjustment.' })).toMatchObject({
      customerApprovalStatus: 'NOT_REQUIRED',
      proposedAmountMinor: null,
      additionalWorkMayBegin: false,
    });
  });

  it('does not allow chargeable work before capacity review', () => {
    expect(() => validateScopeMismatchResolution({
      resolution: 'CHARGEABLE_ADDITIONAL_WORK',
      proposedAmountMinor: 25000,
      customerApprovalStatus: 'PENDING',
    })).toThrow('Capacity must be reviewed');
  });

  it('does not allow chargeable work to begin while customer approval is pending', () => {
    expect(validateScopeMismatchResolution({
      resolution: 'CHARGEABLE_ADDITIONAL_WORK',
      proposedAmountMinor: 25000,
      capacityReviewed: true,
      customerApprovalStatus: 'PENDING',
    }).additionalWorkMayBegin).toBe(false);
  });

  it('requires approval evidence before chargeable work may begin', () => {
    const approvedAt = new Date(Date.now() - 60_000).toISOString();
    expect(validateScopeMismatchResolution({
      resolution: 'CHARGEABLE_ADDITIONAL_WORK',
      proposedAmountMinor: 25000,
      capacityReviewed: true,
      customerApprovalStatus: 'APPROVED',
      customerApprovalMethod: 'PHONE',
      customerApprovedAt: approvedAt,
    })).toMatchObject({ customerApprovalStatus: 'APPROVED', additionalWorkMayBegin: true });
  });

  it('rejects prices on non-chargeable outcomes', () => {
    expect(() => validateScopeMismatchResolution({
      resolution: 'NO_CHANGE_REQUIRED',
      proposedAmountMinor: 1000,
    })).toThrow('only allowed for chargeable');
  });
});
