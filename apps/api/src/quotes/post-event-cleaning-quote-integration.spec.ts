import { describe, expect, it } from '@jest/globals';
import { resolveApprovedCleanerHours } from './approved-quote-cost-model';
import type { QuotePricingSubmission } from './quote-operational-cost-source';
import { calculateWebsiteQuotePricing } from './website-quote-pricing';

function postEventSubmission(overrides: Partial<QuotePricingSubmission['request']['postEvent']> = {}): QuotePricingSubmission {
  return {
    customer: {
      fullName: 'Test Customer',
      email: 'test@example.com',
      mobile: '+27110000000',
      preferredContact: 'WHATSAPP',
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
        ...overrides,
      },
    },
    visit: {
      preferredDate: '2026-08-24',
      preferredTime: 'MORNING',
      flexibility: 'Flexible',
      urgency: 'Standard',
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

describe('Post-Event Cleaning canonical Quote integration', () => {
  it('feeds the approved 20.5 cleaner-hour workload into operational costing', () => {
    expect(resolveApprovedCleanerHours(postEventSubmission())).toEqual({
      kind: 'READY',
      cleanerHours: 20.5,
      provenance: 'post-event-cleaning-operating-model:v1',
    });
  });

  it('feeds the approved R2,500 preliminary price into the shared profitability boundary', () => {
    const result = calculateWebsiteQuotePricing(postEventSubmission(), {
      labourMinor: 50_000,
      deploymentMinor: 5_000,
      consumablesMinor: 5_000,
      equipmentVehicleReserveMinor: 5_000,
      overheadMinor: 20_000,
      minimumContributionMinor: 21_250,
    });

    expect(result.attentionReasons).toEqual([]);
    expect(result.requiresBreakEvenReview).toBe(false);
    expect(result.pricing.lines).toEqual([
      expect.objectContaining({
        code: 'PRIMARY_POST_EVENT_CLEANING',
        label: 'Post-Event Cleaning',
        lineAmountMinor: 250_000,
      }),
    ]);
    expect(result.pricing.subtotalMinor).toBe(250_000);
    expect(result.pricing.adjustmentsMinor).toBe(0);
    expect(result.pricing.totalMinor).toBe(250_000);
  });

  it('fails closed when structured Post-Event facts are absent', () => {
    const submission = postEventSubmission();
    delete submission.request.postEvent;

    expect(resolveApprovedCleanerHours(submission)).toEqual(expect.objectContaining({
      kind: 'NEEDS_ATTENTION',
      provenance: 'post-event-cleaning-operating-model:v1',
    }));

    const pricing = calculateWebsiteQuotePricing(submission);
    expect(pricing.pricing.lines).toEqual([]);
    expect(pricing.attentionReasons).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'POST_EVENT_FACTS_REQUIRED' }),
    ]));
  });

  it('does not emit an automatic primary price when the 24-hour ceiling is exceeded', () => {
    const submission = postEventSubmission({
      guestBand: 'FROM_101_TO_150',
      bathrooms: 3,
      kitchenSubstantiallyUsed: true,
      dishwashing: 'HEAVY',
    });
    submission.property.floorSize = 'FROM_170_TO_219';

    const workload = resolveApprovedCleanerHours(submission);
    expect(workload).toEqual(expect.objectContaining({ kind: 'NEEDS_ATTENTION' }));

    const pricing = calculateWebsiteQuotePricing(submission);
    expect(pricing.pricing.lines).toEqual([]);
    expect(pricing.attentionReasons).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'WORKLOAD_CEILING_EXCEEDED' }),
    ]));
  });
});
