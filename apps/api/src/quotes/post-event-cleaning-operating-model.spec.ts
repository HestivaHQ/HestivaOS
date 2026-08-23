import { describe, expect, it } from '@jest/globals';
import { resolvePostEventCleaning, type PostEventCleaningRequest } from './post-event-cleaning-operating-model';

function request(overrides: Partial<PostEventCleaningRequest> = {}): PostEventCleaningRequest {
  return {
    floorSize: 'FROM_40_TO_59',
    guestBand: 'ONE_TO_20',
    bathrooms: 1,
    kitchenSubstantiallyUsed: false,
    dishwashing: 'NONE',
    outdoorAreas: [],
    wasteLevel: 'LIGHT',
    significantOrdinarySoiling: false,
    lateNightOrOvernight: false,
    bulkWasteRemovalRequested: false,
    specialistContamination: false,
    specialistCarpetOrUpholstery: false,
    complexVenue: false,
    ...overrides,
  };
}

describe('Post-Event Cleaning operating model', () => {
  it('resolves the approved base ladder for an ordinary small event', () => {
    expect(resolvePostEventCleaning(request())).toEqual(expect.objectContaining({
      baseCleanerHours: 6.5,
      additionalCleanerHours: 0,
      totalCleanerHours: 6.5,
      basePriceMinor: 95_000,
      workloadAdjustmentMinor: 0,
      preliminaryPriceMinor: 95_000,
      reviewReasons: [],
      automaticPricingAllowed: true,
    }));
  });

  it('adds deterministic event workload at R100 per additional cleaner-hour', () => {
    const result = resolvePostEventCleaning(request({
      floorSize: 'FROM_100_TO_129',
      guestBand: 'FROM_51_TO_100',
      bathrooms: 2,
      kitchenSubstantiallyUsed: true,
      outdoorAreas: ['PATIO'],
      wasteLevel: 'MODERATE',
    }));

    // 4 guests + 1.5 bathroom + 2 kitchen + 1.5 patio + 1.5 waste = 10.5 h.
    expect(result).toEqual(expect.objectContaining({
      baseCleanerHours: 10,
      additionalCleanerHours: 10.5,
      totalCleanerHours: 20.5,
      basePriceMinor: 145_000,
      workloadAdjustmentMinor: 105_000,
      preliminaryPriceMinor: 250_000,
      automaticPricingAllowed: true,
    }));
  });

  it('ignores duplicate outdoor subtypes so the same workload is not double-counted', () => {
    const result = resolvePostEventCleaning(request({ outdoorAreas: ['PATIO', 'PATIO'] }));
    expect(result.additionalCleanerHours).toBe(1.5);
  });

  it('routes 300+ m² and 150+ guest events to review without inventing a base price', () => {
    const result = resolvePostEventCleaning(request({
      floorSize: 'FROM_300_UP',
      guestBand: 'FROM_150_UP',
    }));

    expect(result.basePriceMinor).toBeNull();
    expect(result.preliminaryPriceMinor).toBeNull();
    expect(result.automaticPricingAllowed).toBe(false);
    expect(result.reviewReasons).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'FLOOR_SIZE_REVIEW' }),
      expect.objectContaining({ code: 'GUEST_COUNT_REVIEW' }),
    ]));
  });

  it('routes workloads above 24 cleaner-hours to review', () => {
    const result = resolvePostEventCleaning(request({
      floorSize: 'FROM_170_TO_219',
      guestBand: 'FROM_101_TO_150',
      bathrooms: 3,
      kitchenSubstantiallyUsed: true,
      dishwashing: 'HEAVY',
    }));

    expect(result.totalCleanerHours).toBe(30);
    expect(result.automaticPricingAllowed).toBe(false);
    expect(result.reviewReasons).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'WORKLOAD_CEILING_EXCEEDED' }),
    ]));
  });

  it('routes overnight, bulk waste, specialist and complex-venue work to deliberate review', () => {
    const result = resolvePostEventCleaning(request({
      lateNightOrOvernight: true,
      bulkWasteRemovalRequested: true,
      specialistContamination: true,
      specialistCarpetOrUpholstery: true,
      complexVenue: true,
    }));

    expect(result.automaticPricingAllowed).toBe(false);
    expect(result.reviewReasons.map(({ code }) => code)).toEqual(expect.arrayContaining([
      'OVERNIGHT_REVIEW',
      'BULK_WASTE_REVIEW',
      'SPECIALIST_CONTAMINATION_REVIEW',
      'SPECIALIST_CARPET_UPHOLSTERY_REVIEW',
      'COMPLEX_VENUE_REVIEW',
    ]));
  });

  it('requires a known floor size and a positive exact bathroom count', () => {
    const result = resolvePostEventCleaning(request({ floorSize: 'UNKNOWN', bathrooms: 0 }));
    expect(result.automaticPricingAllowed).toBe(false);
    expect(result.reviewReasons).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'FLOOR_SIZE_REQUIRED' }),
      expect.objectContaining({ code: 'INVALID_BATHROOM_COUNT' }),
    ]));
  });
});
