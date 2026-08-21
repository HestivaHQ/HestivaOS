import { describe, expect, it } from '@jest/globals';
import { calculateAdminReviewedQuotePricing } from './quote-admin-repricing';
import type { WebsiteQuoteSubmissionV2 } from './website-quote-contract-v2';

function submission(): WebsiteQuoteSubmissionV2 & { adminReview?: Record<string, unknown> } {
  return {
    schemaVersion: '2.0',
    submissionId: '11111111-1111-4111-8111-111111111111',
    source: 'HESTIVA_WEBSITE',
    submittedAt: '2026-08-21T10:00:00.000Z',
    customer: { fullName: 'Test Customer', email: 'test@example.com', mobile: '+27821234567', preferredContact: 'EMAIL' },
    property: {
      propertyType: 'HOUSE', addressLine1: '1 Test Street', suburb: 'Johannesburg', country: 'South Africa',
      floorSize: 'FROM_100_TO_129', bedrooms: 'THREE', bathrooms: 'TWO', livingAreas: 'ONE', outdoorArea: 'NONE', estateClassification: 'NONE',
    },
    request: {
      primaryService: { websiteValue: 'Deep Cleaning', canonicalService: 'Deep Cleaning' },
      frequency: 'ONE_TIME', homeCondition: 'STANDARD',
      addOns: [
        { websiteValue: 'Inside oven', canonicalService: 'Inside Oven Cleaning', quantity: 1 },
        { websiteValue: 'Garage sweep', canonicalService: 'Garage Sweeping', quantity: 1 },
        { websiteValue: 'Extra bathroom', canonicalService: 'Extra Bathroom Cleaning', quantity: 1 },
        { websiteValue: 'Pet hair', canonicalService: 'Pet-Hair Treatment', quantity: 1 },
      ],
    },
    visit: { preferredDate: '2026-08-25', preferredTime: 'MORNING', flexibility: 'Flexible', urgency: 'Normal' },
    access: { complexAccess: 'NOT_APPLICABLE', keyHandover: 'SOMEONE_WILL_OPEN', someonePresent: true },
    household: { hasPets: true }, safety: {}, notes: {}, photos: [],
  };
}

const costs = {
  labourMinor: 0,
  deploymentMinor: 0,
  consumablesMinor: 0,
  equipmentVehicleReserveMinor: 0,
  overheadMinor: 0,
  minimumContributionMinor: 0,
};

describe('calculateAdminReviewedQuotePricing', () => {
  it('uses the approved R150 fixed Pet-Hair Treatment price without asking for pet count', () => {
    const value = submission();
    value.request.addOns = [{ websiteValue: 'Pet hair', canonicalService: 'Pet-Hair Treatment', quantity: 1 }];
    const result = calculateAdminReviewedQuotePricing(value, costs);
    expect(result.pricing.lines).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'ADDON_PET_HAIR_TREATMENT', unitAmountMinor: 15_000, lineAmountMinor: 15_000 }),
    ]));
    expect(result.attentionReasons.some((reason) => reason.code === 'ADD_ON_DETAIL_REQUIRED')).toBe(false);
  });

  it('prices oven, garage and extra bathroom only from explicit Admin review facts', () => {
    const value = submission();
    value.adminReview = {
      addOns: {
        '0': { ovenSize: 'STANDARD_SINGLE', severeBakedOnGrease: true },
        '1': { garageSize: 'DOUBLE' },
        '2': { bathroomType: 'LARGE_MASTER' },
      },
    };
    const result = calculateAdminReviewedQuotePricing(value as any, costs);
    expect(result.pricing.lines).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'ADDON_INSIDE_OVEN', unitAmountMinor: 50_000 }),
      expect.objectContaining({ code: 'ADDON_GARAGE_CLEANING', unitAmountMinor: 40_000 }),
      expect.objectContaining({ code: 'ADDON_EXTRA_BATHROOM', unitAmountMinor: 30_000 }),
      expect.objectContaining({ code: 'ADDON_PET_HAIR_TREATMENT', unitAmountMinor: 15_000 }),
    ]));
    expect(result.attentionReasons).toHaveLength(0);
  });

  it('keeps larger multi-car garage work blocked for assessment', () => {
    const value = submission();
    value.request.addOns = [{ websiteValue: 'Garage sweep', canonicalService: 'Garage Sweeping', quantity: 1 }];
    value.adminReview = { addOns: { '0': { garageSize: 'LARGER_MULTI_CAR' } } };
    const result = calculateAdminReviewedQuotePricing(value as any, costs);
    expect(result.attentionReasons).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'ADD_ON_ASSESSMENT_REQUIRED' }),
    ]));
  });
});
