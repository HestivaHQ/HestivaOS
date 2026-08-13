import type { QuoteOperationalCostSnapshot } from './quote-profitability';
import type { WebsiteQuoteSubmissionV1 } from './website-quote-contract';
import type { WebsiteQuoteSubmissionV2 } from './website-quote-contract-v2';

export type WebsiteQuoteSubmission = WebsiteQuoteSubmissionV1 | WebsiteQuoteSubmissionV2;

export const QUOTE_OPERATIONAL_COST_PROVIDER = 'QUOTE_OPERATIONAL_COST_PROVIDER' as const;

export const QUOTE_OPERATIONAL_COST_COMPONENTS = [
  'labourMinor',
  'deploymentMinor',
  'consumablesMinor',
  'equipmentVehicleReserveMinor',
  'overheadMinor',
  'minimumContributionMinor',
] as const;

export type QuoteOperationalCostComponent = (typeof QUOTE_OPERATIONAL_COST_COMPONENTS)[number];

export type QuoteOperationalCostProvenance = Partial<Record<QuoteOperationalCostComponent, string>>;

export type QuoteOperationalCostCandidate = Partial<QuoteOperationalCostSnapshot> & {
  provenance?: QuoteOperationalCostProvenance;
};

export type QuoteOperationalCostResolution =
  | {
      kind: 'READY';
      costs: QuoteOperationalCostSnapshot;
      provenance: QuoteOperationalCostProvenance;
    }
  | {
      kind: 'NEEDS_ATTENTION';
      missing: QuoteOperationalCostComponent[];
      invalid: QuoteOperationalCostComponent[];
      provenance: QuoteOperationalCostProvenance;
    };

/**
 * An authoritative provider resolves booking-specific internal economics.
 * It must not derive customer-facing catalogue prices and must not invent
 * missing operational costs. A provider may source values from labour,
 * deployment, consumables, reserve, overhead and contribution subsystems.
 */
export interface QuoteOperationalCostProvider {
  resolve(submission: WebsiteQuoteSubmission): Promise<QuoteOperationalCostCandidate | null>;
}

function validMinorUnitAmount(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

export function validateOperationalCostCandidate(
  candidate: QuoteOperationalCostCandidate | null | undefined,
): QuoteOperationalCostResolution {
  const provenance = candidate?.provenance ?? {};
  const missing: QuoteOperationalCostComponent[] = [];
  const invalid: QuoteOperationalCostComponent[] = [];

  for (const component of QUOTE_OPERATIONAL_COST_COMPONENTS) {
    const value = candidate?.[component];
    if (value === undefined || value === null) {
      missing.push(component);
    } else if (!validMinorUnitAmount(value)) {
      invalid.push(component);
    }
  }

  if (missing.length || invalid.length) {
    return { kind: 'NEEDS_ATTENTION', missing, invalid, provenance };
  }

  return {
    kind: 'READY',
    costs: {
      labourMinor: candidate!.labourMinor!,
      deploymentMinor: candidate!.deploymentMinor!,
      consumablesMinor: candidate!.consumablesMinor!,
      equipmentVehicleReserveMinor: candidate!.equipmentVehicleReserveMinor!,
      overheadMinor: candidate!.overheadMinor!,
      minimumContributionMinor: candidate!.minimumContributionMinor!,
    },
    provenance,
  };
}

export async function resolveQuoteOperationalCosts(
  provider: QuoteOperationalCostProvider,
  submission: WebsiteQuoteSubmission,
): Promise<QuoteOperationalCostResolution> {
  return validateOperationalCostCandidate(await provider.resolve(submission));
}
