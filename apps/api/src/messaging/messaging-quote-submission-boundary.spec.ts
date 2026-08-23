import { describe, expect, it } from '@jest/globals';
import type { MessagingQuoteDraft } from './messaging-quote-draft';
import { prepareMessagingQuoteSubmission } from './messaging-quote-submission-boundary';

function validDraft(): MessagingQuoteDraft {
  return {
    customer: {
      fullName: 'Test Customer',
      email: 'test@example.com',
      mobile: '+27821234567',
      preferredContact: 'WHATSAPP',
    },
    property: {
      propertyType: 'APARTMENT',
      suburb: 'Rosebank',
      addressLine1: '1 Example Street',
      country: 'South Africa',
      floorSize: 'FROM_60_TO_79',
      bedrooms: 'TWO',
      bathrooms: 'TWO',
      livingAreas: 'ONE',
      outdoorArea: 'BALCONY',
      estateClassification: 'COMPLEX',
      exactFloor: 3,
      buildingAccess: 'ELEVATOR',
    },
    request: {
      primaryService: {
        websiteValue: 'Regular Home Cleaning',
        canonicalService: 'Regular Home Cleaning',
      },
      frequency: 'WEEKLY',
      homeCondition: 'STANDARD',
      addOns: [],
      ecoFriendlyProducts: false,
    },
    visit: {
      preferredDate: '2026-08-25',
      preferredTime: 'MORNING',
      flexibility: 'Flexible by one day',
      urgency: 'Normal',
    },
    access: {
      complexAccess: 'VISITOR_SIGN_IN',
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
}

function validPostEventDraft(): MessagingQuoteDraft {
  const draft = validDraft();
  draft.request = {
    primaryService: {
      websiteValue: 'Post-Event Cleaning',
      canonicalService: 'Post-Event Cleaning',
    },
    frequency: 'ONE_TIME',
    homeCondition: 'STANDARD',
    addOns: [],
    ecoFriendlyProducts: false,
    postEvent: {
      eventType: 'PARTY_BIRTHDAY',
      venueType: 'APARTMENT',
      guestBand: 'FROM_21_TO_50',
      bathrooms: 2,
      kitchenSubstantiallyUsed: true,
      dishwashing: 'MODERATE',
      outdoorAreas: ['BALCONY'],
      wasteLevel: 'MODERATE',
      significantOrdinarySoiling: false,
      lateNightOrOvernight: false,
      bulkWasteRemovalRequested: false,
      specialistContamination: false,
      specialistCarpetOrUpholstery: false,
      complexVenue: false,
    },
  };
  return draft;
}

describe('prepareMessagingQuoteSubmission', () => {
  it('does not allow submission before explicit customer confirmation', () => {
    const result = prepareMessagingQuoteSubmission({ draft: validDraft() });

    expect(result).toEqual({ kind: 'NOT_READY', phase: 'REVIEW' });
  });

  it('does not allow submission while human review is required', () => {
    const result = prepareMessagingQuoteSubmission({
      draft: validDraft(),
      customerConfirmed: true,
      humanReviewRequired: true,
    });

    expect(result).toEqual({ kind: 'NOT_READY', phase: 'HUMAN_REVIEW' });
  });

  it('fails closed when completed facts violate canonical Quote v2 business rules', () => {
    const draft = validDraft();
    draft.customer.mobile = '082 123 4567';

    const result = prepareMessagingQuoteSubmission({
      draft,
      customerConfirmed: true,
    });

    expect(result.kind).toBe('INVALID');
    if (result.kind === 'INVALID') {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: 'customer.mobile', code: 'INVALID_E164' }),
        ]),
      );
    }
  });

  it('returns only canonical messaging business facts when the draft is valid and confirmed', () => {
    const draft = validDraft();
    const result = prepareMessagingQuoteSubmission({
      draft,
      customerConfirmed: true,
    });

    expect(result).toEqual({ kind: 'READY', draft });
    expect(result).not.toHaveProperty('source');
    expect(result).not.toHaveProperty('submissionId');
  });

  it('allows a complete confirmed Post-Event draft through the channel-neutral business boundary', () => {
    const draft = validPostEventDraft();
    expect(prepareMessagingQuoteSubmission({ draft })).toEqual({ kind: 'NOT_READY', phase: 'REVIEW' });

    const result = prepareMessagingQuoteSubmission({ draft, customerConfirmed: true });
    expect(result).toEqual({ kind: 'READY', draft });
  });

  it('fails closed when Post-Event structured facts are malformed', () => {
    const draft = validPostEventDraft();
    draft.request.postEvent!.bathrooms = 0;
    draft.request.postEvent!.outdoorAreas = ['BALCONY', 'BALCONY'];

    const result = prepareMessagingQuoteSubmission({ draft, customerConfirmed: true });
    expect(result.kind).toBe('INVALID');
    if (result.kind === 'INVALID') {
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: 'request.postEvent.bathrooms', code: 'INVALID_QUANTITY' }),
        expect.objectContaining({ path: 'request.postEvent.outdoorAreas.1', code: 'DUPLICATE' }),
      ]));
    }
  });

  it('rejects Post-Event facts attached to a different primary service', () => {
    const draft = validPostEventDraft();
    draft.request.primaryService = {
      websiteValue: 'Regular Home Cleaning',
      canonicalService: 'Regular Home Cleaning',
    };
    draft.request.frequency = 'WEEKLY';

    const result = prepareMessagingQuoteSubmission({ draft, customerConfirmed: true });
    expect(result.kind).toBe('INVALID');
    if (result.kind === 'INVALID') {
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: 'request.postEvent', code: 'POST_EVENT_SERVICE_MISMATCH' }),
      ]));
    }
  });
});
