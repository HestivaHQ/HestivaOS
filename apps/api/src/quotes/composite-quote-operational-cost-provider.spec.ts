import { describe, expect, it } from '@jest/globals';
import { CompositeQuoteOperationalCostProvider } from './composite-quote-operational-cost-provider';
import { resolveQuoteOperationalCosts } from './quote-operational-cost-source';
import type { WebsiteQuoteSubmissionV2 } from './website-quote-contract-v2';

const submission = {
  schemaVersion: '2.0',
  submissionId: '11111111-1111-4111-8111-111111111111',
} as WebsiteQuoteSubmissionV2;

describe('CompositeQuoteOperationalCostProvider', () => {
  it('combines independent authoritative component resolvers and preserves provenance', async () => {
    const provider = new CompositeQuoteOperationalCostProvider({
      labourMinor: async () => ({ amountMinor: 45_000, provenance: 'labour:v1' }),
      deploymentMinor: async () => ({ amountMinor: 12_500, provenance: 'deployment:v1' }),
      consumablesMinor: async () => ({ amountMinor: 5_000, provenance: 'consumables:v1' }),
      equipmentVehicleReserveMinor: async () => ({ amountMinor: 4_000, provenance: 'reserve:v1' }),
      overheadMinor: async () => ({ amountMinor: 8_000, provenance: 'overhead:v1' }),
      minimumContributionMinor: async () => ({ amountMinor: 12_000, provenance: 'contribution:v1' }),
    });

    const result = await resolveQuoteOperationalCosts(provider, submission);
    expect(result.kind).toBe('READY');
    if (result.kind === 'READY') {
      expect(result.costs.deploymentMinor).toBe(12_500);
      expect(result.provenance.minimumContributionMinor).toBe('contribution:v1');
    }
  });

  it('keeps unresolved component values missing instead of silently substituting zero', async () => {
    const provider = new CompositeQuoteOperationalCostProvider({
      labourMinor: async () => ({ amountMinor: 45_000 }),
      deploymentMinor: async () => ({ amountMinor: null, provenance: 'deployment:unavailable' }),
      consumablesMinor: async () => ({ amountMinor: 5_000 }),
      equipmentVehicleReserveMinor: async () => ({ amountMinor: 4_000 }),
      overheadMinor: async () => ({ amountMinor: 8_000 }),
      minimumContributionMinor: async () => ({ amountMinor: 12_000 }),
    });

    const result = await resolveQuoteOperationalCosts(provider, submission);
    expect(result.kind).toBe('NEEDS_ATTENTION');
    if (result.kind === 'NEEDS_ATTENTION') {
      expect(result.missing).toEqual(['deploymentMinor']);
      expect(result.provenance.deploymentMinor).toBe('deployment:unavailable');
    }
  });
});
