import { describe, expect, it } from '@jest/globals';
import { calculateWebsiteQuotePricing } from './website-quote-pricing';
import type { WebsiteQuoteSubmissionV2 } from './website-quote-contract-v2';

function baseSubmission(overrides: Partial<WebsiteQuoteSubmissionV2> = {}): WebsiteQuoteSubmissionV2 {
  const submission: WebsiteQuoteSubmissionV2 = {
    schemaVersion: '2.0',
    submissionId: '11111111-1111-4111-8111-111111111111',
    source: 'HESTIVA_WEBSITE',
    submittedAt: '2026-08-12T17:00:00.000Z',
    customer: {
      fullName: 'Test Customer',
      email: 'test@example.com',
      mobile: '+27821234567',
      preferredContact: 'EMAIL',
    },
    property: {
      propertyType: 'HOUSE',
      addressLine1: '1 Test Street',
      suburb: 'Johannesburg',
      country: 'South Africa',
      floorSize: 'FROM_100_TO_129',
      bedrooms: 'THREE',
      bathrooms: 'TWO',
      livingAreas: 'ONE',
      outdoorArea: 'NONE',
      estateClassification: 'NONE',
    },
    request: {
      primaryService: {
        websiteValue: 'Regular Home Cleaning',
        canonicalService: 'Regular Home Cleaning',
      },
      frequency: 'ONE_TIME',
      homeCondition: 'STANDARD',
      addOns: [],
    },
    visit: {
      preferredDate: '2026-08-20',
      preferredTime: 'MORNING',
      flexibility: 'Flexible by one day',
      urgency: 'Normal',
    },
    access: {
      complexAccess: 'NOT_APPLICABLE',
      keyHandover: 'SOMEONE_WILL_OPEN',
      someonePresent: true,
    },
    household: {
      hasPets: false,
    },
    safety: {},
    notes: {},
    photos: [],
  };

  return { ...submission, ...overrides };
}

describe('calculateWebsiteQuotePricing', () => {
  it('uses the canonical Regular Cleaning floor ladder in minor units', () => {
    const result = calculateWebsiteQuotePricing(baseSubmission());

    expect(result.pricing.lines[0]).toMatchObject({
      label: 'Regular Home Cleaning',
      quantity: 1,
      unitAmountMinor: 87_500,
      lineAmountMinor: 87_500,
    });
    expect(result.pricing.subtotalMinor).toBe(87_500);
    expect(result.attentionReasons.some((reason) => reason.code === 'BREAK_EVEN_REVIEW_REQUIRED')).toBe(true);
  });

  it('uses the canonical Deep Cleaning ladder independently from Regular Cleaning', () => {
    const submission = baseSubmission();
    submission.request.primaryService = {
      websiteValue: 'Deep Cleaning',
      canonicalService: 'Deep Cleaning',
    };

    const result = calculateWebsiteQuotePricing(submission);
    expect(result.pricing.lines[0].unitAmountMinor).toBe(135_000);
  });

  it('uses the shared Move-In / Move-Out ladder', () => {
    const moveIn = baseSubmission();
    moveIn.request.primaryService = {
      websiteValue: 'Move-In Cleaning',
      canonicalService: 'Move-In Cleaning',
    };
    const moveOut = baseSubmission();
    moveOut.request.primaryService = {
      websiteValue: 'Move-Out Cleaning',
      canonicalService: 'Move-Out Cleaning',
    };

    expect(calculateWebsiteQuotePricing(moveIn).pricing.lines[0].unitAmountMinor).toBe(155_000);
    expect(calculateWebsiteQuotePricing(moveOut).pricing.lines[0].unitAmountMinor).toBe(155_000);
  });

  it('prices structured Laundry and Ironing using the approved per-load amounts', () => {
    const submission = baseSubmission();
    submission.request.laundry = {
      facilities: 'WASHER_DRYER',
      laundryLoads: 2,
      ironingLoads: 3,
    };

    const result = calculateWebsiteQuotePricing(submission);

    expect(result.pricing.lines).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'ADDON_LAUNDRY_WASH_DRY_FOLD', quantity: 2, unitAmountMinor: 17_500, lineAmountMinor: 35_000 }),
      expect.objectContaining({ code: 'ADDON_IRONING', quantity: 3, unitAmountMinor: 15_000, lineAmountMinor: 45_000 }),
    ]));
    expect(result.pricing.subtotalMinor).toBe(167_500);
    expect(result.attentionReasons.some((reason) => reason.code === 'LAUNDRY_CAPACITY_REVIEW')).toBe(true);
  });

  it('uses Wash & Hang when the property has a washer but no dryer', () => {
    const submission = baseSubmission();
    submission.request.laundry = {
      facilities: 'WASHER_LINE',
      laundryLoads: 1,
    };

    const result = calculateWebsiteQuotePricing(submission);
    expect(result.pricing.lines).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'ADDON_LAUNDRY_WASH_HANG', unitAmountMinor: 12_500 }),
    ]));
  });

  it('does not reinstate the superseded Post-Renovation instant formula', () => {
    const submission = baseSubmission();
    submission.request.primaryService = {
      websiteValue: 'Post-Renovation Cleaning',
      canonicalService: 'Post-Renovation Cleaning',
    };

    const result = calculateWebsiteQuotePricing(submission);
    expect(result.pricing.lines).toHaveLength(0);
    expect(result.attentionReasons).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'ASSESSMENT_REQUIRED' }),
    ]));
  });

  it('fails closed on generic add-ons whose canonical size/condition detail is missing', () => {
    const submission = baseSubmission();
    submission.request.addOns = [{
      websiteValue: 'Inside oven',
      canonicalService: 'Inside Oven Cleaning',
      quantity: 1,
    }];

    const result = calculateWebsiteQuotePricing(submission);
    expect(result.attentionReasons).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'ADD_ON_DETAIL_REQUIRED', path: 'request.addOns.0' }),
    ]));
  });

  it('marks unknown floor size for review instead of inventing a band', () => {
    const submission = baseSubmission();
    submission.property.floorSize = 'UNKNOWN';

    const result = calculateWebsiteQuotePricing(submission);
    expect(result.pricing.lines).toHaveLength(0);
    expect(result.attentionReasons).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'FLOOR_SIZE_REQUIRED' }),
    ]));
  });

  it('represents the eco-friendly preference at R0 without inventing a surcharge', () => {
    const submission = baseSubmission();
    submission.request.ecoFriendlyProducts = true;

    const result = calculateWebsiteQuotePricing(submission);
    expect(result.pricing.lines).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'PREFERENCE_ECO_FRIENDLY', unitAmountMinor: 0, lineAmountMinor: 0 }),
    ]));
  });
});
