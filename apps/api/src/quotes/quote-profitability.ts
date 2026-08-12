export type QuoteOperationalCostSnapshot = {
  labourMinor: number;
  deploymentMinor: number;
  consumablesMinor: number;
  equipmentVehicleReserveMinor: number;
  overheadMinor: number;
  minimumContributionMinor: number;
};

export type QuoteProfitabilityResult = {
  costTotalMinor: number;
  requiredMinimumMinor: number;
  catalogueSubtotalMinor: number;
  profitabilityAdjustmentMinor: number;
  preRoundingTotalMinor: number;
  roundingAdjustmentMinor: number;
  finalTotalMinor: number;
};

function assertNonNegativeInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer amount in ZAR minor units.`);
  }
}

export function roundUpToNextTenRandMinor(valueMinor: number): number {
  assertNonNegativeInteger('valueMinor', valueMinor);
  const tenRandMinor = 1_000;
  return Math.ceil(valueMinor / tenRandMinor) * tenRandMinor;
}

export function applyQuoteProfitabilityFloor(
  catalogueSubtotalMinor: number,
  costs: QuoteOperationalCostSnapshot,
): QuoteProfitabilityResult {
  assertNonNegativeInteger('catalogueSubtotalMinor', catalogueSubtotalMinor);
  Object.entries(costs).forEach(([name, value]) => assertNonNegativeInteger(name, value));

  const costTotalMinor =
    costs.labourMinor +
    costs.deploymentMinor +
    costs.consumablesMinor +
    costs.equipmentVehicleReserveMinor +
    costs.overheadMinor;
  const requiredMinimumMinor = costTotalMinor + costs.minimumContributionMinor;
  const profitabilityAdjustmentMinor = Math.max(0, requiredMinimumMinor - catalogueSubtotalMinor);
  const preRoundingTotalMinor = catalogueSubtotalMinor + profitabilityAdjustmentMinor;
  const finalTotalMinor = roundUpToNextTenRandMinor(preRoundingTotalMinor);
  const roundingAdjustmentMinor = finalTotalMinor - preRoundingTotalMinor;

  return {
    costTotalMinor,
    requiredMinimumMinor,
    catalogueSubtotalMinor,
    profitabilityAdjustmentMinor,
    preRoundingTotalMinor,
    roundingAdjustmentMinor,
    finalTotalMinor,
  };
}
