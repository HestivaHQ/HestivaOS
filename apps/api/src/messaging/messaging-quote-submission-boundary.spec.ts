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
});
