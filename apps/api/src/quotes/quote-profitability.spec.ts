import { describe, expect, it } from '@jest/globals';
import { applyQuoteProfitabilityFloor, roundUpToNextTenRandMinor } from './quote-profitability';

describe('quote profitability floor', () => {
  it('raises a quote to the required internal cost plus contribution floor', () => {
    const result = applyQuoteProfitabilityFloor(80_000, {
      labourMinor: 45_000,
      deploymentMinor: 12_500,
      consumablesMinor: 5_000,
      equipmentVehicleReserveMinor: 4_000,
      overheadMinor: 8_000,
      minimumContributionMinor: 12_000,
    });

    expect(result.costTotalMinor).toBe(74_500);
    expect(result.requiredMinimumMinor).toBe(86_500);
    expect(result.profitabilityAdjustmentMinor).toBe(6_500);
    expect(result.preRoundingTotalMinor).toBe(86_500);
    expect(result.finalTotalMinor).toBe(87_000);
    expect(result.roundingAdjustmentMinor).toBe(500);
  });

  it('does not reduce a catalogue price that already clears the floor', () => {
    const result = applyQuoteProfitabilityFloor(120_000, {
      labourMinor: 40_000,
      deploymentMinor: 10_000,
      consumablesMinor: 5_000,
      equipmentVehicleReserveMinor: 5_000,
      overheadMinor: 10_000,
      minimumContributionMinor: 10_000,
    });

    expect(result.requiredMinimumMinor).toBe(80_000);
    expect(result.profitabilityAdjustmentMinor).toBe(0);
    expect(result.finalTotalMinor).toBe(120_000);
  });

  it('rounds the final customer price upward to the next R10 and never downward', () => {
    expect(roundUpToNextTenRandMinor(123_100)).toBe(124_000);
    expect(roundUpToNextTenRandMinor(124_000)).toBe(124_000);
    expect(roundUpToNextTenRandMinor(124_100)).toBe(125_000);
    expect(roundUpToNextTenRandMinor(89_700)).toBe(90_000);
  });

  it('rejects missing-style invalid negative or fractional internal costs', () => {
    expect(() => applyQuoteProfitabilityFloor(100_000, {
      labourMinor: -1,
      deploymentMinor: 0,
      consumablesMinor: 0,
      equipmentVehicleReserveMinor: 0,
      overheadMinor: 0,
      minimumContributionMinor: 0,
    })).toThrow(/labourMinor/);

    expect(() => applyQuoteProfitabilityFloor(100_000, {
      labourMinor: 1.5,
      deploymentMinor: 0,
      consumablesMinor: 0,
      equipmentVehicleReserveMinor: 0,
      overheadMinor: 0,
      minimumContributionMinor: 0,
    })).toThrow(/labourMinor/);
  });
});
