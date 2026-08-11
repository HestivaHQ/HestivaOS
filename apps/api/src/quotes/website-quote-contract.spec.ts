import {
  WEBSITE_QUOTE_SCHEMA_VERSION,
  WEBSITE_QUOTE_SOURCE,
  allowedFrequenciesForCanonicalService,
  validateWebsiteQuoteSubmissionV1,
  type WebsiteQuoteSubmissionV1,
} from './website-quote-contract';

function validPayload(): WebsiteQuoteSubmissionV1 {
  return {
    schemaVersion: WEBSITE_QUOTE_SCHEMA_VERSION,
    submissionId: '123e4567-e89b-42d3-a456-426614174000',
    source: WEBSITE_QUOTE_SOURCE,
    submittedAt: '2026-08-11T03:30:00.000Z',
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
      floorSize: 'FROM_80_TO_150',
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
      addOns: [
        { websiteValue: 'Inside oven', canonicalService: 'Inside Oven Cleaning', quantity: 1 },
        { websiteValue: 'Extra refrigerator', canonicalService: 'Extra Refrigerator', quantity: 2 },
      ],
      ecoFriendlyProducts: true,
    },
    visit: {
      preferredDate: '2026-08-20',
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
    photos: [
      {
        clientPhotoId: '223e4567-e89b-42d3-a456-426614174000',
        fileName: 'kitchen.jpg',
        contentType: 'image/jpeg',
        byteSize: 3,
        sha256: 'a'.repeat(64),
        transfer: { kind: 'UPLOAD', dataBase64: 'YWJj' },
      },
    ],
  };
}

describe('Slice 5M website quote contract', () => {
  it('accepts the locked structured website Quote Submission Payload v1', () => {
    expect(validateWebsiteQuoteSubmissionV1(validPayload())).toEqual([]);
  });

  it('preserves only service-frequency restrictions verified in the existing website source', () => {
    expect(allowedFrequenciesForCanonicalService('Move-In Cleaning')).toEqual(['ONE_TIME']);
    expect(allowedFrequenciesForCanonicalService('Deep Cleaning')).toEqual(['ONE_TIME', 'MONTHLY', 'CUSTOM']);
    expect(allowedFrequenciesForCanonicalService('Regular Home Cleaning')).toEqual([
      'ONE_TIME',
      'WEEKLY',
      'EVERY_TWO_WEEKS',
      'MONTHLY',
      'CUSTOM',
    ]);
    expect(allowedFrequenciesForCanonicalService('Kitchen Cleaning')).toEqual(['ONE_TIME', 'CUSTOM']);
    expect(allowedFrequenciesForCanonicalService('Post-Renovation Cleaning')).toBeNull();
  });

  it('rejects a frequency that violates a verified service rule', () => {
    const payload = validPayload();
    payload.request.primaryService = {
      websiteValue: 'Move-Out Cleaning',
      canonicalService: 'Move-Out Cleaning',
    };
    payload.request.frequency = 'WEEKLY';
    expect(validateWebsiteQuoteSubmissionV1(payload)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'request.frequency', code: 'INVALID_FOR_SERVICE' }),
      ]),
    );
  });

  it('requires details for CUSTOM frequency', () => {
    const payload = validPayload();
    payload.request.frequency = 'CUSTOM';
    expect(validateWebsiteQuoteSubmissionV1(payload)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'request.customFrequencyNote', code: 'REQUIRED' }),
      ]),
    );
  });

  it('supports quantity only for Extra Refrigerator and Balcony / Patio Cleaning in v1', () => {
    const payload = validPayload();
    payload.request.addOns = [
      { websiteValue: 'Inside oven', canonicalService: 'Inside Oven Cleaning', quantity: 2 },
      { websiteValue: 'Balcony / Patio Cleaning', canonicalService: 'Balcony / Patio Cleaning', quantity: 2 },
      { websiteValue: 'Extra refrigerator', canonicalService: 'Extra Refrigerator', quantity: 3 },
    ];
    const errors = validateWebsiteQuoteSubmissionV1(payload);
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'request.addOns.0.quantity', code: 'QUANTITY_NOT_SUPPORTED' }),
      ]),
    );
    expect(errors).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'request.addOns.1.quantity', code: 'QUANTITY_NOT_SUPPORTED' }),
        expect.objectContaining({ path: 'request.addOns.2.quantity', code: 'QUANTITY_NOT_SUPPORTED' }),
      ]),
    );
  });

  it('keeps bathroom Other out by type and requires exact floor/access for unit properties', () => {
    const payload = validPayload();
    payload.property.exactFloor = undefined;
    payload.property.buildingAccess = undefined;
    expect(validateWebsiteQuoteSubmissionV1(payload)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'property.exactFloor', code: 'INVALID_EXACT_FLOOR' }),
        expect.objectContaining({ path: 'property.buildingAccess', code: 'REQUIRED' }),
      ]),
    );
  });

  it('requires E.164 mobile normalization for reliable matching', () => {
    const payload = validPayload();
    payload.customer.mobile = '082 123 4567';
    expect(validateWebsiteQuoteSubmissionV1(payload)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'customer.mobile', code: 'INVALID_E164' }),
      ]),
    );
  });

  it('allows only explicit pseudo choices to carry a null canonical primary Service', () => {
    const payload = validPayload();
    payload.request.primaryService = { websiteValue: 'Not sure', canonicalService: null };
    payload.request.frequency = 'CUSTOM';
    payload.request.customFrequencyNote = 'Customer wants advice before choosing a service.';
    expect(validateWebsiteQuoteSubmissionV1(payload)).toEqual([]);

    payload.request.primaryService = { websiteValue: 'Unknown service', canonicalService: null };
    expect(validateWebsiteQuoteSubmissionV1(payload)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'request.primaryService.canonicalService', code: 'UNMAPPED_SERVICE' }),
      ]),
    );
  });

  it('rejects photo identity/hash conflicts and invalid server-bound image metadata', () => {
    const payload = validPayload();
    payload.photos.push({
      clientPhotoId: payload.photos[0].clientPhotoId,
      fileName: 'other.png',
      contentType: 'image/png',
      byteSize: 3,
      sha256: 'b'.repeat(64),
      transfer: { kind: 'UPLOAD', dataBase64: 'ZGVm' },
    });
    expect(validateWebsiteQuoteSubmissionV1(payload)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'photos.1.clientPhotoId', code: 'PHOTO_ID_HASH_CONFLICT' }),
      ]),
    );
  });
});
