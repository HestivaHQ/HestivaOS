import { describe, expect, it } from '@jest/globals';
import {
  LAUNDRY_PRICE_MINOR,
  isLaundryEligiblePrimary,
  resolveLaundryRequest,
} from './laundry-operating-model';

describe('laundry operating model', () => {
  it('allows laundry only on approved whole-home services', () => {
    expect(isLaundryEligiblePrimary('Regular Home Cleaning')).toBe(true);
    expect(isLaundryEligiblePrimary('Deep Cleaning')).toBe(true);
    expect(isLaundryEligiblePrimary('Move-In Cleaning')).toBe(false);
    expect(isLaundryEligiblePrimary('Move-Out Cleaning')).toBe(false);
    expect(isLaundryEligiblePrimary('Post-Renovation Cleaning')).toBe(false);
    expect(isLaundryEligiblePrimary(null)).toBe(false);
  });

  it('prices washer and dryer laundry as Wash, Dry & Fold', () => {
    const result = resolveLaundryRequest({
      primaryService: 'Regular Home Cleaning',
      facilities: 'WASHER_DRYER',
      laundryLoads: 2,
    });

    expect(result.errors).toEqual([]);
    expect(result.resolved).toEqual(
      expect.objectContaining({
        outcome: 'WASH_DRY_FOLD',
        laundryLoads: 2,
        laundryUnitAmountMinor: LAUNDRY_PRICE_MINOR.WASH_DRY_FOLD,
        requestedLaundryAmountMinor: 35_000,
      }),
    );
  });

  it('prices washer and line-drying laundry as Wash & Hang', () => {
    const result = resolveLaundryRequest({
      primaryService: 'Deep Cleaning',
      facilities: 'WASHER_LINE',
      laundryLoads: 3,
    });

    expect(result.errors).toEqual([]);
    expect(result.resolved).toEqual(
      expect.objectContaining({
        outcome: 'WASH_HANG',
        laundryLoads: 3,
        laundryUnitAmountMinor: LAUNDRY_PRICE_MINOR.WASH_HANG,
        requestedLaundryAmountMinor: 37_500,
      }),
    );
  });

  it('keeps ironing separate and prices it per standard load', () => {
    const result = resolveLaundryRequest({
      primaryService: 'Regular Home Cleaning',
      ironingLoads: 2,
    });

    expect(result.errors).toEqual([]);
    expect(result.resolved).toEqual(
      expect.objectContaining({
        ironingLoads: 2,
        ironingUnitAmountMinor: LAUNDRY_PRICE_MINOR.IRONING,
        requestedIroningAmountMinor: 30_000,
      }),
    );
  });

  it('fails closed when laundry is attached to an ineligible primary service', () => {
    const result = resolveLaundryRequest({
      primaryService: 'Move-In Cleaning',
      facilities: 'WASHER_DRYER',
      laundryLoads: 1,
    });

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'INELIGIBLE_PRIMARY_SERVICE' }),
      ]),
    );
  });

  it('rejects laundry when no washer is available', () => {
    const result = resolveLaundryRequest({
      primaryService: 'Regular Home Cleaning',
      facilities: 'NO_WASHER',
      laundryLoads: 1,
    });

    expect(result.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'NO_WASHER' })]),
    );
  });

  it('rejects invalid load quantities', () => {
    const result = resolveLaundryRequest({
      primaryService: 'Deep Cleaning',
      facilities: 'WASHER_LINE',
      laundryLoads: 0,
      ironingLoads: 1.5,
    });

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'laundryLoads', code: 'INVALID_LOAD_QUANTITY' }),
        expect.objectContaining({ path: 'ironingLoads', code: 'INVALID_LOAD_QUANTITY' }),
      ]),
    );
  });
});
