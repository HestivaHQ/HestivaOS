import {
  WEBSITE_QUOTE_CONTRACT_VERSION,
  allowedFrequenciesForWebsiteService,
  validateWebsiteQuoteSubmissionV1,
  type WebsiteQuoteSubmissionV1,
} from './website-quote-contract';

function validPayload(): WebsiteQuoteSubmissionV1 {
  return {
    schemaVersion: WEBSITE_QUOTE_CONTRACT_VERSION,
    submissionKey: 'submission-123',
    customer: {
      fullName: 'Test Customer',
      email: 'test@example.com',
      mobile: '+27821234567',
      preferredContactMethod: 'WhatsApp',
    },
    property: {
      propertyType: 'Apartment',
      suburb: 'Rosebank',
      addressLine1: '1 Example Street',
      floorSize: 'FROM_80_TO_150',
      bedrooms: 'TWO',
      bathrooms: 'TWO',
      livingAreas: 'ONE',
      outdoorArea: 'BALCONY',
      estateClassification: 'COMPLEX',
      unitFloor: 'THIRD',
      buildingAccess: 'ELEVATOR',
    },
    service: {
      primaryService: 'Regular Home Cleaning',
      frequency: 'WEEKLY',
      homeCondition: 'STANDARD',
      addOns: [
        { name: 'Inside Oven Cleaning', quantity: 1 },
        { name: 'Extra Refrigerator', quantity: 2 },
      ],
      ecoFriendlyProducts: true,
    },
    visit: {
      preferredDate: '2026-08-20',
      preferredTimeWindow: 'MORNING',
    },
    accessAndHousehold: {
      complexAccessMethod: 'Visitor sign-in',
      keyHandoverMethod: 'Someone will open',
      someonePresent: true,
      hasPets: false,
    },
    notes: {},
    photos: [
      {
        transferKey: 'photo-123',
        originalFileName: 'kitchen.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 12345,
      },
    ],
  };
}

describe('Slice 5M website quote contract', () => {
  it('accepts a deterministic canonical website quote payload', () => {
    expect(validateWebsiteQuoteSubmissionV1(validPayload())).toEqual([]);
  });

  it('preserves the approved service-specific frequency rules', () => {
    expect(allowedFrequenciesForWebsiteService('Move-In Cleaning')).toEqual(['ONE_TIME']);
    expect(allowedFrequenciesForWebsiteService('Deep Cleaning')).toEqual(['ONE_TIME', 'MONTHLY', 'CUSTOM']);
    expect(allowedFrequenciesForWebsiteService('Regular Home Cleaning')).toEqual([
      'ONE_TIME',
      'WEEKLY',
      'EVERY_TWO_WEEKS',
      'MONTHLY',
      'CUSTOM',
    ]);
    expect(allowedFrequenciesForWebsiteService('Kitchen Cleaning')).toEqual(['ONE_TIME', 'CUSTOM']);
  });

  it('rejects unsupported service frequency and missing custom-frequency detail', () => {
    const payload = validPayload();
    payload.service.primaryService = 'Move-Out Cleaning';
    payload.service.frequency = 'WEEKLY';
    expect(validateWebsiteQuoteSubmissionV1(payload)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'service.frequency', code: 'INVALID_FOR_SERVICE' }),
      ]),
    );

    payload.service.primaryService = 'Kitchen Cleaning';
    payload.service.frequency = 'CUSTOM';
    expect(validateWebsiteQuoteSubmissionV1(payload)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'service.customFrequencyNote', code: 'REQUIRED' }),
      ]),
    );
  });

  it('allows quantity only for the approved quantity-capable add-ons', () => {
    const payload = validPayload();
    payload.service.addOns = [
      { name: 'Inside Oven Cleaning', quantity: 2 },
      { name: 'Balcony / Patio Cleaning', quantity: 2 },
      { name: 'Extra Refrigerator', quantity: 3 },
    ];
    const errors = validateWebsiteQuoteSubmissionV1(payload);
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'service.addOns.0.quantity', code: 'QUANTITY_NOT_SUPPORTED' }),
      ]),
    );
    expect(errors).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'service.addOns.1.quantity', code: 'QUANTITY_NOT_SUPPORTED' }),
        expect.objectContaining({ path: 'service.addOns.2.quantity', code: 'QUANTITY_NOT_SUPPORTED' }),
      ]),
    );
  });

  it('keeps bathroom Other out and validates unit-access requirements', () => {
    const payload = validPayload();
    payload.property.unitFloor = undefined;
    payload.property.buildingAccess = undefined;
    expect(validateWebsiteQuoteSubmissionV1(payload)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'property.unitFloor', code: 'REQUIRED' }),
        expect.objectContaining({ path: 'property.buildingAccess', code: 'REQUIRED' }),
      ]),
    );
  });

  it('rejects duplicate photo retry identities and invalid image metadata', () => {
    const payload = validPayload();
    payload.photos.push({
      transferKey: 'photo-123',
      originalFileName: 'notes.pdf',
      mimeType: 'application/pdf',
    });
    expect(validateWebsiteQuoteSubmissionV1(payload)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'photos.1.transferKey', code: 'DUPLICATE' }),
        expect.objectContaining({ path: 'photos.1.mimeType', code: 'INVALID_MIME_TYPE' }),
      ]),
    );
  });

  it('supports explicit Needs Review primary-service states without fuzzy mapping', () => {
    const payload = validPayload();
    payload.service.primaryService = null;
    payload.service.unresolvedPrimaryService = 'NOT_SURE';
    payload.service.frequency = 'CUSTOM';
    payload.service.customFrequencyNote = 'Customer wants advice before choosing a service.';
    expect(validateWebsiteQuoteSubmissionV1(payload)).toEqual([]);
  });
});
