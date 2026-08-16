import { ConflictException } from '@nestjs/common';
import { describe, expect, it } from '@jest/globals';
import { projectAcceptedOneTimeSubmission } from './quote-acceptance';

const submission: any = {
  schemaVersion: '2.0',
  customer: { fullName: 'Alex Example', email: 'ALEX@example.com', mobile: '+27821234567' },
  property: { propertyType: 'APARTMENT', addressLine1: '1 Main Road', suburb: 'Durban', country: 'South Africa', floorSize: 'FROM_80_TO_99', bedrooms: 'THREE', bathrooms: 'TWO', livingAreas: 'ONE', outdoorArea: 'NONE', estateClassification: 'COMPLEX', exactFloor: 12, buildingAccess: 'ELEVATOR' },
  request: {
    primaryService: { canonicalService: 'Regular Home Cleaning' }, frequency: 'ONE_TIME', homeCondition: 'STANDARD',
    addOns: [{ canonicalService: 'Inside Oven Cleaning', quantity: 2 }], ecoFriendlyProducts: true,
    laundry: { facilities: 'WASHER_DRYER', laundryLoads: 3, ironingLoads: 4 },
  },
  visit: { preferredDate: '2026-08-20', alternativeDate: '2026-08-21', preferredTime: 'MORNING', flexibility: 'One day either side', urgency: 'Urgent' },
  access: { complexAccess: 'VISITOR_SIGN_IN', securityInstructions: 'Report to security', parking: 'Bay 7', keyHandover: 'TO_BE_ARRANGED', keyHandoverDetails: 'Call on arrival', someonePresent: false },
  household: { hasPets: false }, safety: { existingDamage: 'Customer reports a cracked tile' }, notes: { attentionAreas: 'Kitchen counters' },
};

describe('accepted ONE_TIME Quote projection', () => {
  it('preserves generic, Laundry and Ironing quantities exactly', () => {
    const result = projectAcceptedOneTimeSubmission(submission);
    expect(result.frequency).toBe('ONE_TIME');
    expect(result.addOns).toEqual([
      { serviceName: 'Inside Oven Cleaning', quantity: 2 },
      { serviceName: 'Laundry', quantity: 3 },
      { serviceName: 'Ironing', quantity: 4 },
    ]);
    expect(result.scheduledAt.toISOString()).toBe('2026-08-19T22:00:00.000Z');
    expect(result.description).toBe('Kitchen counters');
    expect(result).toEqual(expect.objectContaining({
      preferredTimeWindow: 'MORNING', alternativeDate: new Date('2026-08-21T00:00:00.000Z'), dateFlexibility: 'One day either side', urgency: 'Urgent',
      exactFloor: 12, buildingAccess: 'ELEVATOR', complexAccess: 'VISITOR_SIGN_IN', accessInstructions: 'Report to security', parkingInstructions: 'Bay 7',
      keyHandover: 'TO_BE_ARRANGED', keyHandoverDetails: 'Call on arrival', someonePresent: false, ecoFriendlyProducts: true,
      customerDeclaredExistingDamage: 'Customer reports a cracked tile',
    }));
  });

  it('fails closed for recurring conversion and invalid quantities', () => {
    expect(() => projectAcceptedOneTimeSubmission({ ...submission, request: { ...submission.request, frequency: 'WEEKLY' } })).toThrow(ConflictException);
    expect(() => projectAcceptedOneTimeSubmission({ ...submission, request: { ...submission.request, laundry: { ironingLoads: 0 } } })).toThrow(ConflictException);
  });
});
