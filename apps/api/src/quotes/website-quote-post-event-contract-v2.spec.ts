import { describe, expect, it } from '@jest/globals';
import { WEBSITE_QUOTE_SOURCE } from './website-quote-contract';
import {
  WEBSITE_QUOTE_SCHEMA_VERSION_V2,
  validateWebsiteQuoteSubmissionV2,
  type WebsiteQuoteSubmissionV2,
} from './website-quote-contract-v2';

function validPostEvent(): WebsiteQuoteSubmissionV2 {
  return {
    schemaVersion: WEBSITE_QUOTE_SCHEMA_VERSION_V2,
    submissionId: '123e4567-e89b-42d3-a456-426614174000',
    source: WEBSITE_QUOTE_SOURCE,
    submittedAt: '2026-08-23T13:30:00.000Z',
    customer: {
      fullName: 'Post Event Customer',
      email: 'event@example.com',
      mobile: '+27821234567',
      preferredContact: 'WHATSAPP',
    },
    property: {
      propertyType: 'HOUSE',
      suburb: 'Johannesburg',
      addressLine1: '1 Event Street',
      country: 'South Africa',
      floorSize: 'FROM_100_TO_129',
      bedrooms: 'THREE',
      bathrooms: 'TWO',
      livingAreas: 'ONE',
      storeys: 'ONE',
      outdoorArea: 'PATIO',
      estateClassification: 'NONE',
    },
    request: {
      primaryService: {
        websiteValue: 'Post-Event Cleaning',
        canonicalService: 'Post-Event Cleaning',
      },
      frequency: 'ONE_TIME',
      homeCondition: 'STANDARD',
      addOns: [],
      postEvent: {
        eventType: 'PARTY_BIRTHDAY',
        venueType: 'HOME',
        guestBand: 'FROM_51_TO_100',
        bathrooms: 2,
        kitchenSubstantiallyUsed: true,
        dishwashing: 'NONE',
        outdoorAreas: ['PATIO'],
        wasteLevel: 'MODERATE',
        significantOrdinarySoiling: false,
        lateNightOrOvernight: false,
        bulkWasteRemovalRequested: false,
        specialistContamination: false,
        specialistCarpetOrUpholstery: false,
        complexVenue: false,
      },
    },
    visit: {
      preferredDate: '2026-08-25',
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

describe('Website Quote contract v2 Post-Event Cleaning', () => {
  it('accepts the exact approved Post-Event primary mapping and structured facts', () => {
    expect(validateWebsiteQuoteSubmissionV2(validPostEvent())).toEqual([]);
  });

  it('keeps Post-Event Cleaning once-off only', () => {
    const payload = validPostEvent();
    payload.request.frequency = 'WEEKLY';

    expect(validateWebsiteQuoteSubmissionV2(payload)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'request.frequency', code: 'INVALID_FOR_SERVICE' }),
    ]));
  });

  it('requires structured Post-Event facts for the Post-Event primary service', () => {
    const payload = validPostEvent();
    delete payload.request.postEvent;

    expect(validateWebsiteQuoteSubmissionV2(payload)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'request.postEvent', code: 'INVALID_OBJECT' }),
    ]));
  });

  it('rejects malformed Post-Event workload facts', () => {
    const payload = validPostEvent();
    payload.request.postEvent!.bathrooms = 0;
    payload.request.postEvent!.outdoorAreas = ['PATIO', 'PATIO'];

    expect(validateWebsiteQuoteSubmissionV2(payload)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'request.postEvent.bathrooms', code: 'INVALID_QUANTITY' }),
      expect.objectContaining({ path: 'request.postEvent.outdoorAreas.1', code: 'DUPLICATE' }),
    ]));
  });

  it('rejects Post-Event facts attached to another primary service', () => {
    const payload = validPostEvent();
    payload.request.primaryService = {
      websiteValue: 'Regular Home Cleaning',
      canonicalService: 'Regular Home Cleaning',
    };
    payload.request.frequency = 'WEEKLY';

    expect(validateWebsiteQuoteSubmissionV2(payload)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'request.postEvent', code: 'POST_EVENT_SERVICE_MISMATCH' }),
    ]));
  });
});
