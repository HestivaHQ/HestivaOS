import { describe, expect, it } from '@jest/globals';
import {
  WEBSITE_QUOTE_SCHEMA_VERSION,
  WEBSITE_QUOTE_SOURCE,
  allowedFrequenciesForCanonicalService,
  validateWebsiteQuoteSubmissionV1,
  type WebsiteQuoteSubmissionV1,
} from './website-quote-contract';

const ABC_SHA256 = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
const DEF_SHA256 = 'cb8379ac2098aa165029e3938a51da0bcecfc008fd6795f401178647f96c5b34';

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
        sha256: ABC_SHA256,
        transfer: { kind: 'UPLOAD', dataBase64: 'YWJj' },
      },
    ],
  };
}

describe('Slice 5M website quote contract', () => {
  it('accepts the locked structured website Quote Submission Payload v1', () => {
    expect(validateWebsiteQuoteSubmissionV1(validPayload())).toEqual([]);
  });

  it('accepts every approved floor-size band and rejects superseded broad bands', () => {
    const approved = [
      'UNDER_40',
      'FROM_40_TO_59',
      'FROM_60_TO_79',
      'FROM_80_TO_99',
      'FROM_100_TO_129',
      'FROM_130_TO_169',
      'FROM_170_TO_219',
      'FROM_220_TO_299',
      'FROM_300_UP',
      'UNKNOWN',
    ];

    for (const floorSize of approved) {
      const payload = validPayload() as unknown as Record<string, unknown>;
      (payload.property as Record<string, unknown>).floorSize = floorSize;
      expect(validateWebsiteQuoteSubmissionV1(payload)).toEqual([]);
    }

    const legacy = validPayload() as unknown as Record<string, unknown>;
    (legacy.property as Record<string, unknown>).floorSize = 'FROM_80_TO_150';
    expect(validateWebsiteQuoteSubmissionV1(legacy)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'property.floorSize', code: 'INVALID_ENUM' }),
      ]),
    );
  });

  it('treats arbitrary JSON as untrusted input and returns errors instead of throwing', () => {
    expect(() => validateWebsiteQuoteSubmissionV1({})).not.toThrow();
    expect(validateWebsiteQuoteSubmissionV1({})).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'customer', code: 'INVALID_OBJECT' }),
        expect.objectContaining({ path: 'property', code: 'INVALID_OBJECT' }),
        expect.objectContaining({ path: 'request', code: 'INVALID_OBJECT' }),
        expect.objectContaining({ path: 'photos', code: 'INVALID_ARRAY' }),
      ]),
    );
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

  it('fails closed on unknown or incorrect primary Service mappings', () => {
    const unknown = validPayload() as unknown as Record<string, unknown>;
    const unknownRequest = unknown.request as Record<string, unknown>;
    unknownRequest.primaryService = { websiteValue: 'Mystery Cleaning', canonicalService: 'Mystery Cleaning' };
    expect(validateWebsiteQuoteSubmissionV1(unknown)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'request.primaryService.websiteValue', code: 'UNMAPPED_SERVICE' }),
      ]),
    );

    const wrongAlias = validPayload() as unknown as Record<string, unknown>;
    const wrongRequest = wrongAlias.request as Record<string, unknown>;
    wrongRequest.primaryService = { websiteValue: 'Eco-Friendly Cleaning', canonicalService: 'Eco-Friendly Cleaning' };
    expect(validateWebsiteQuoteSubmissionV1(wrongAlias)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'request.primaryService.canonicalService', code: 'INVALID_MAPPING' }),
      ]),
    );
  });

  it('allows only explicit pseudo choices to carry a null canonical primary Service', () => {
    const payload = validPayload();
    payload.request.primaryService = { websiteValue: 'Not sure', canonicalService: null };
    payload.request.frequency = 'CUSTOM';
    payload.request.customFrequencyNote = 'Customer wants advice before choosing a service.';
    expect(validateWebsiteQuoteSubmissionV1(payload)).toEqual([]);

    const unknown = validPayload() as unknown as Record<string, unknown>;
    const unknownRequest = unknown.request as Record<string, unknown>;
    unknownRequest.primaryService = { websiteValue: 'Unknown service', canonicalService: null };
    expect(validateWebsiteQuoteSubmissionV1(unknown)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'request.primaryService.websiteValue', code: 'UNMAPPED_SERVICE' }),
      ]),
    );
  });

  it('fails closed on unknown or superseded add-on mappings', () => {
    const payload = validPayload() as unknown as Record<string, unknown>;
    const request = payload.request as Record<string, unknown>;
    request.addOns = [
      { websiteValue: 'Post-renovation dust removal', canonicalService: 'Post-Renovation Cleaning', quantity: 1 },
      { websiteValue: 'Unknown add-on', canonicalService: 'Inside Oven Cleaning', quantity: 1 },
    ];
    expect(validateWebsiteQuoteSubmissionV1(payload)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'request.addOns.0.websiteValue', code: 'UNMAPPED_ADD_ON' }),
        expect.objectContaining({ path: 'request.addOns.1.websiteValue', code: 'UNMAPPED_ADD_ON' }),
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

  it('keeps bathroom Other out at runtime and requires exact floor/access for unit properties', () => {
    const payload = validPayload() as unknown as Record<string, unknown>;
    const property = payload.property as Record<string, unknown>;
    property.bathrooms = 'OTHER';
    property.exactFloor = undefined;
    property.buildingAccess = undefined;
    expect(validateWebsiteQuoteSubmissionV1(payload)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'property.bathrooms', code: 'INVALID_ENUM' }),
        expect.objectContaining({ path: 'property.exactFloor', code: 'INVALID_EXACT_FLOOR' }),
        expect.objectContaining({ path: 'property.buildingAccess', code: 'INVALID_ENUM' }),
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

  it('rejects impossible calendar dates rather than validating format only', () => {
    const payload = validPayload();
    payload.visit.preferredDate = '2026-02-31';
    expect(validateWebsiteQuoteSubmissionV1(payload)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'visit.preferredDate', code: 'INVALID_DATE' }),
      ]),
    );
  });

  it('independently validates received photo bytes, declared size, and SHA-256', () => {
    const sizeMismatch = validPayload();
    sizeMismatch.photos[0].byteSize = 4;
    expect(validateWebsiteQuoteSubmissionV1(sizeMismatch)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'photos.0.byteSize', code: 'BYTE_SIZE_MISMATCH' }),
      ]),
    );

    const hashMismatch = validPayload();
    hashMismatch.photos[0].sha256 = DEF_SHA256;
    expect(validateWebsiteQuoteSubmissionV1(hashMismatch)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'photos.0.sha256', code: 'SHA256_MISMATCH' }),
      ]),
    );
  });

  it('rejects photo identity/hash conflicts', () => {
    const payload = validPayload();
    payload.photos.push({
      clientPhotoId: payload.photos[0].clientPhotoId,
      fileName: 'other.png',
      contentType: 'image/png',
      byteSize: 3,
      sha256: DEF_SHA256,
      transfer: { kind: 'UPLOAD', dataBase64: 'ZGVm' },
    });
    expect(validateWebsiteQuoteSubmissionV1(payload)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'photos.1.clientPhotoId', code: 'PHOTO_ID_HASH_CONFLICT' }),
      ]),
    );
  });
});
