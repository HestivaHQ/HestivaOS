import { ConflictException } from '@nestjs/common';
import { describe, expect, it } from '@jest/globals';
import { projectAcceptedOneTimeSubmission } from './quote-acceptance';

const submission: any = {
  schemaVersion: '2.0',
  customer: { fullName: 'Alex Example', email: 'ALEX@example.com', mobile: '+27821234567' },
  property: { propertyType: 'HOUSE', addressLine1: '1 Main Road', suburb: 'Durban', country: 'South Africa', floorSize: 'FROM_80_TO_99', bedrooms: 'THREE', bathrooms: 'TWO', livingAreas: 'ONE', outdoorArea: 'NONE', estateClassification: 'NONE' },
  request: {
    primaryService: { canonicalService: 'Regular Home Cleaning' }, frequency: 'ONE_TIME', homeCondition: 'STANDARD',
    addOns: [{ canonicalService: 'Inside Oven Cleaning', quantity: 2 }],
    laundry: { facilities: 'WASHER_DRYER', laundryLoads: 3, ironingLoads: 4 },
  },
  visit: { preferredDate: '2026-08-20', preferredTime: 'MORNING' },
  household: { hasPets: false }, safety: {}, notes: { attentionAreas: 'Kitchen counters' },
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
  });

  it('fails closed for recurring conversion and invalid quantities', () => {
    expect(() => projectAcceptedOneTimeSubmission({ ...submission, request: { ...submission.request, frequency: 'WEEKLY' } })).toThrow(ConflictException);
    expect(() => projectAcceptedOneTimeSubmission({ ...submission, request: { ...submission.request, laundry: { ironingLoads: 0 } } })).toThrow(ConflictException);
  });
});
