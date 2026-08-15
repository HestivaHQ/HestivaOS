import { describe, expect, it } from '@jest/globals';
import {
  WEBSITE_QUOTE_SCHEMA_VERSION,
  WEBSITE_QUOTE_SOURCE,
  type WebsiteQuoteSubmissionV1,
} from './website-quote-contract';
import {
  WEBSITE_QUOTE_SCHEMA_VERSION_V2,
  validateWebsiteQuoteSubmissionV2,
  type WebsiteQuoteSubmissionV2,
} from './website-quote-contract-v2';

function baseV1(): WebsiteQuoteSubmissionV1 {
  return {
    schemaVersion: WEBSITE_QUOTE_SCHEMA_VERSION,
    submissionId: '123e4567-e89b-42d3-a456-426614174000',
    source: WEBSITE_QUOTE_SOURCE,
    submittedAt: '2026-08-12T03:30:00.000Z',
    customer: {
      fullName: 'Laundry Customer',
      email: 'laundry@example.com',
      mobile: '+27821234567',
      preferredContact: 'WHATSAPP',
    },
    property: {
      propertyType: 'HOUSE',
      suburb: 'Johannesburg',
      addressLine1: '1 Example Street',
      country: 'South Africa',
      floorSize: 'FROM_100_TO_129',
      bedrooms: 'THREE',
      bathrooms: 'TWO',
      livingAreas: 'ONE',
      storeys: 'ONE',
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
      ecoFriendlyProducts: false,
    },
    visit: {
      preferredDate: '2026-08-20',
      preferredTime: 'MORNING',
      flexibility: 'Flexible',
      urgency: 'Normal',
    },
    access: {
      complexAccess: 'NOT_APPLICABLE',
      keyHandover: 'SOMEONE_WILL_OPEN',
      someonePresent: true,
    },
    household: { hasPets: false },
    safety: {},
    notes: {},
    photos: [],
  };
}

function validV2(): WebsiteQuoteSubmissionV2 {
  const v1 = baseV1();
  return {
    ...v1,
    schemaVersion: WEBSITE_QUOTE_SCHEMA_VERSION_V2,
    request: {
      ...v1.request,
      laundry: {
        facilities: 'WASHER_DRYER',
        laundryLoads: 2,
        ironingLoads: 1,
      },
    },
  };
}

describe('Website Quote contract v2 structured laundry', () => {
  it('accepts structured Wash, Dry & Fold plus ironing on Regular Cleaning', () => {
    expect(validateWebsiteQuoteSubmissionV2(validV2())).toEqual([]);
  });

  it('accepts Wash & Hang on Deep Cleaning', () => {
    const payload = validV2();
    payload.request.primaryService = {
      websiteValue: 'Deep Cleaning',
      canonicalService: 'Deep Cleaning',
    };
    payload.request.frequency = 'ONE_TIME';
    payload.request.laundry = {
      facilities: 'WASHER_LINE',
      laundryLoads: 3,
    };
    expect(validateWebsiteQuoteSubmissionV2(payload)).toEqual([]);
  });

  it('allows ironing without a laundry facilities answer when no washing is requested', () => {
    const payload = validV2();
    payload.request.laundry = { ironingLoads: 2 };
    expect(validateWebsiteQuoteSubmissionV2(payload)).toEqual([]);
  });

  it('rejects laundry on Move-In Cleaning', () => {
    const payload = validV2();
    payload.request.primaryService = {
      websiteValue: 'Move-In Cleaning',
      canonicalService: 'Move-In Cleaning',
    };
    expect(validateWebsiteQuoteSubmissionV2(payload)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'request.primaryService.canonicalService',
          code: 'INELIGIBLE_PRIMARY_SERVICE',
        }),
      ]),
    );
  });

  it('rejects no-washer laundry and missing facilities', () => {
    const noWasher = validV2();
    noWasher.request.laundry = { facilities: 'NO_WASHER', laundryLoads: 1 };
    expect(validateWebsiteQuoteSubmissionV2(noWasher)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'request.laundry.facilities', code: 'NO_WASHER' }),
      ]),
    );

    const missing = validV2();
    missing.request.laundry = { laundryLoads: 1 };
    expect(validateWebsiteQuoteSubmissionV2(missing)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'request.laundry.facilities', code: 'FACILITIES_REQUIRED' }),
      ]),
    );
  });

  it('rejects invalid load quantities', () => {
    const payload = validV2();
    payload.request.laundry = {
      facilities: 'WASHER_DRYER',
      laundryLoads: 0,
      ironingLoads: 1.5,
    };
    expect(validateWebsiteQuoteSubmissionV2(payload)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'request.laundry.laundryLoads', code: 'INVALID_LOAD_QUANTITY' }),
        expect.objectContaining({ path: 'request.laundry.ironingLoads', code: 'INVALID_LOAD_QUANTITY' }),
      ]),
    );
  });

  it('rejects Laundry and Ironing inside generic addOns because v2 requires structured laundry', () => {
    const payload = validV2();
    payload.request.addOns = [
      { websiteValue: 'Laundry', canonicalService: 'Laundry', quantity: 2 },
      { websiteValue: 'Ironing', canonicalService: 'Ironing', quantity: 1 },
    ];
    expect(validateWebsiteQuoteSubmissionV2(payload)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'request.addOns.0.canonicalService', code: 'STRUCTURED_LAUNDRY_REQUIRED' }),
        expect.objectContaining({ path: 'request.addOns.1.canonicalService', code: 'STRUCTURED_LAUNDRY_REQUIRED' }),
      ]),
    );
  });

  it('rejects an empty structured laundry object', () => {
    const payload = validV2();
    payload.request.laundry = {};
    expect(validateWebsiteQuoteSubmissionV2(payload)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'request.laundry', code: 'EMPTY_LAUNDRY_REQUEST' }),
      ]),
    );
  });

  it('accepts Townhouse storeys without apartment exact-floor or building-access fields', () => {
    const payload = validV2();
    payload.request.laundry = undefined;
    payload.property = {
      ...payload.property,
      propertyType: 'TOWNHOUSE',
      storeys: 'TWO',
    };
    delete payload.property.exactFloor;
    delete payload.property.buildingAccess;

    expect(validateWebsiteQuoteSubmissionV2(payload)).toEqual([]);
  });

  it('continues to require exact-floor and building-access fields for Apartments', () => {
    const payload = validV2();
    payload.request.laundry = undefined;
    payload.property = {
      ...payload.property,
      propertyType: 'APARTMENT',
    };
    delete payload.property.exactFloor;
    delete payload.property.buildingAccess;

    expect(validateWebsiteQuoteSubmissionV2(payload)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'property.exactFloor', code: 'INVALID_EXACT_FLOOR' }),
        expect.objectContaining({ path: 'property.buildingAccess' }),
      ]),
    );
  });

  it('accepts the full recurring frequency vocabulary for Bedroom Cleaning in v2', () => {
    for (const frequency of ['ONE_TIME', 'WEEKLY', 'EVERY_TWO_WEEKS', 'MONTHLY', 'CUSTOM'] as const) {
      const payload = validV2();
      payload.request.laundry = undefined;
      payload.request.primaryService = {
        websiteValue: 'Bedroom Cleaning',
        canonicalService: 'Bedroom Cleaning',
      };
      payload.request.frequency = frequency;
      payload.request.customFrequencyNote = frequency === 'CUSTOM' ? 'Every six weeks' : undefined;
      expect(validateWebsiteQuoteSubmissionV2(payload)).toEqual([]);
    }
  });

  it('accepts the full recurring frequency vocabulary for Living Area Cleaning in v2', () => {
    for (const frequency of ['ONE_TIME', 'WEEKLY', 'EVERY_TWO_WEEKS', 'MONTHLY', 'CUSTOM'] as const) {
      const payload = validV2();
      payload.request.laundry = undefined;
      payload.request.primaryService = {
        websiteValue: 'Living Area Cleaning',
        canonicalService: 'Living Area Cleaning',
      };
      payload.request.frequency = frequency;
      payload.request.customFrequencyNote = frequency === 'CUSTOM' ? 'Every six weeks' : undefined;
      expect(validateWebsiteQuoteSubmissionV2(payload)).toEqual([]);
    }
  });

  it('does not broaden Kitchen Cleaning frequency policy', () => {
    const payload = validV2();
    payload.request.laundry = undefined;
    payload.request.primaryService = {
      websiteValue: 'Kitchen Cleaning',
      canonicalService: 'Kitchen Cleaning',
    };
    payload.request.frequency = 'WEEKLY';
    expect(validateWebsiteQuoteSubmissionV2(payload)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'request.frequency', code: 'INVALID_FOR_SERVICE' }),
      ]),
    );
  });
});
