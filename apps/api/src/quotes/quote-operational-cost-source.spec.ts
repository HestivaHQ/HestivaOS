import { describe, expect, it } from '@jest/globals';
import {
  resolveQuoteOperationalCosts,
  validateOperationalCostCandidate,
  type QuoteOperationalCostProvider,
} from './quote-operational-cost-source';
import type { WebsiteQuoteSubmissionV2 } from './website-quote-contract-v2';

const submission = {
  schemaVersion: '2.0',
  submissionId: '11111111-1111-4111-8111-111111111111',
} as WebsiteQuoteSubmissionV2;

describe('quote operational cost source', () => {
  it('accepts only a complete non-negative integer minor-unit snapshot', () => {
    const result = validateOperationalCostCandidate({
      labourMinor: 45_000,
      deploymentMinor: 12_500,
      consumablesMinor: 5_000,
      equipmentVehicleReserveMinor: 4_000,
      overheadMinor: 8_000,
      minimumContributionMinor: 12_000,
      provenance: {
        labourMinor: 'labour-estimator:v1',
        deploymentMinor: 'deployment-estimator:v1',
      },
    });

    expect(result).toEqual({
      kind: 'READY',
      costs: {
        labourMinor: 45_000,
        deploymentMinor: 12_500,
        consumablesMinor: 5_000,
        equipmentVehicleReserveMinor: 4_000,
        overheadMinor: 8_000,
        minimumContributionMinor: 12_000,
      },
      provenance: {
        labourMinor: 'labour-estimator:v1',
        deploymentMinor: 'deployment-estimator:v1',
      },
    });
  });

  it('fails closed when any required category is missing', () => {
    const result = validateOperationalCostCandidate({
      labourMinor: 45_000,
      deploymentMinor: 12_500,
      consumablesMinor: 5_000,
      equipmentVehicleReserveMinor: 4_000,
      overheadMinor: 8_000,
    });

    expect(result.kind).toBe('NEEDS_ATTENTION');
    if (result.kind === 'NEEDS_ATTENTION') {
      expect(result.missing).toEqual(['minimumContributionMinor']);
      expect(result.invalid).toEqual([]);
    }
  });

  it('fails closed on negative or fractional values rather than coercing them', () => {
    const result = validateOperationalCostCandidate({
      labourMinor: -1,
      deploymentMinor: 12_500.5,
      consumablesMinor: 5_000,
      equipmentVehicleReserveMinor: 4_000,
      overheadMinor: 8_000,
      minimumContributionMinor: 12_000,
    });

    expect(result.kind).toBe('NEEDS_ATTENTION');
    if (result.kind === 'NEEDS_ATTENTION') {
      expect(result.invalid).toEqual(['labourMinor', 'deploymentMinor']);
    }
  });

  it('treats a provider with no authoritative result as entirely unresolved', async () => {
    const provider: QuoteOperationalCostProvider = {
      async resolve() {
        return null;
      },
    };

    const result = await resolveQuoteOperationalCosts(provider, submission);
    expect(result.kind).toBe('NEEDS_ATTENTION');
    if (result.kind === 'NEEDS_ATTENTION') {
      expect(result.missing).toHaveLength(6);
    }
  });

  it('passes the booking submission to the provider', async () => {
    let seen: WebsiteQuoteSubmissionV2 | undefined;
    const provider: QuoteOperationalCostProvider = {
      async resolve(value) {
        seen = value as WebsiteQuoteSubmissionV2;
        return {
          labourMinor: 1,
          deploymentMinor: 2,
          consumablesMinor: 3,
          equipmentVehicleReserveMinor: 4,
          overheadMinor: 5,
          minimumContributionMinor: 6,
        };
      },
    };

    const result = await resolveQuoteOperationalCosts(provider, submission);
    expect(seen).toBe(submission);
    expect(result.kind).toBe('READY');
  });
});
