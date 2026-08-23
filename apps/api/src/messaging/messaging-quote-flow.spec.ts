import { describe, expect, it } from '@jest/globals';
import { evaluateMessagingQuoteFlow } from './messaging-quote-flow';
import type { MessagingQuoteDraft } from './messaging-quote-draft';

const completeDraft = (): MessagingQuoteDraft => ({
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
  household: { hasPets: false },
  safety: {},
  notes: {},
  photos: [],
});

describe('evaluateMessagingQuoteFlow', () => {
  it('collects missing canonical fact groups in the approved deterministic order', () => {
    const result = evaluateMessagingQuoteFlow({ draft: {} });

    expect(result.phase).toBe('COLLECTING');
    expect(result.nextSection).toBe('YOUR_HOME');
    expect(result.missingFactGroups).toEqual([
      'property',
      'request',
      'visit',
      'access',
      'household',
      'safety',
      'notes',
      'customer',
      'photos',
    ]);
  });

  it('moves to review only after every canonical fact group is valid and complete', () => {
    const result = evaluateMessagingQuoteFlow({ draft: completeDraft() });

    expect(result).toEqual({
      phase: 'REVIEW',
      missingFactGroups: [],
      nextSection: 'REVIEW',
    });
  });

  it('requires explicit customer confirmation before becoming ready to submit', () => {
    const result = evaluateMessagingQuoteFlow({
      draft: completeDraft(),
      customerConfirmed: true,
    });

    expect(result).toEqual({
      phase: 'READY_TO_SUBMIT',
      missingFactGroups: [],
      nextSection: null,
    });
  });

  it('fails closed into human review without pretending the Quote is ready', () => {
    const result = evaluateMessagingQuoteFlow({
      draft: completeDraft(),
      customerConfirmed: true,
      humanReviewRequired: true,
    });

    expect(result.phase).toBe('HUMAN_REVIEW');
    expect(result.nextSection).toBeNull();
  });

  it('treats an already-created canonical Quote as submitted', () => {
    const result = evaluateMessagingQuoteFlow({
      draft: completeDraft(),
      submittedQuoteId: '11111111-1111-4111-8111-111111111111',
    });

    expect(result.phase).toBe('SUBMITTED');
    expect(result.nextSection).toBeNull();
  });
});
