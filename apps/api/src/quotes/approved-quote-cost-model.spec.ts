import { describe, expect, it } from '@jest/globals';
import {
  calculateConsumablesMinor,
  calculateDeploymentMinor,
  calculateEquipmentReserveMinor,
  calculateLabourMinor,
  calculateMinimumContributionMinor,
  calculateOverheadMinor,
} from './approved-quote-cost-model';

describe('approved quote cost model', () => {
  it('applies wage, employer UIF and configured COIDA without SDL', () => {
    expect(calculateLabourMinor(4, 0)).toBe(13_442);
    expect(calculateLabourMinor(4, 0.02)).toBe(13_708);
  });

  it('applies approved consumables rates', () => {
    expect(calculateConsumablesMinor('Regular Home Cleaning', 4)).toBe(2_000);
    expect(calculateConsumablesMinor('Deep Cleaning', 12)).toBe(6_300);
    expect(calculateConsumablesMinor('Move-In Cleaning', 14.5)).toBe(8_525);
    expect(calculateConsumablesMinor('Bathroom Sanitisation', 6.5)).toBe(4_250);
  });

  it('applies equipment and overhead per cleaner-hour', () => {
    expect(calculateEquipmentReserveMinor(10)).toBe(2_000);
    expect(calculateOverheadMinor(10)).toBe(20_000);
  });

  it('applies the approved deployment cost', () => {
    expect(calculateDeploymentMinor(40)).toBe(7_280);
    expect(calculateDeploymentMinor(65)).toBe(11_830);
  });

  it('derives the higher of margin or absolute contribution floor', () => {
    expect(calculateMinimumContributionMinor(20_000)).toBe(10_000);
    expect(calculateMinimumContributionMinor(80_000)).toBe(20_000);
    expect(calculateMinimumContributionMinor(83_400)).toBe(20_850);
  });
});
