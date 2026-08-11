import { describe, expect, it } from '@jest/globals';
import {
  canonicalWebsiteQuotePayload,
  websiteQuotePayloadFingerprint,
  websiteQuotePayloadMatchesFingerprint,
} from './website-quote-idempotency';

describe('website Quote idempotency fingerprint', () => {
  it('is stable when object key order differs', () => {
    const first = {
      submissionId: '123e4567-e89b-42d3-a456-426614174000',
      customer: { fullName: 'Test Customer', email: 'test@example.com' },
      request: { addOns: [{ quantity: 2, canonicalService: 'Extra Refrigerator' }] },
    };
    const second = {
      request: { addOns: [{ canonicalService: 'Extra Refrigerator', quantity: 2 }] },
      customer: { email: 'test@example.com', fullName: 'Test Customer' },
      submissionId: '123e4567-e89b-42d3-a456-426614174000',
    };

    expect(canonicalWebsiteQuotePayload(first)).toBe(canonicalWebsiteQuotePayload(second));
    expect(websiteQuotePayloadFingerprint(first)).toBe(websiteQuotePayloadFingerprint(second));
  });

  it('preserves array order because selected-item order can be material', () => {
    const first = { addOns: ['Inside Oven Cleaning', 'Extra Refrigerator'] };
    const second = { addOns: ['Extra Refrigerator', 'Inside Oven Cleaning'] };
    expect(websiteQuotePayloadFingerprint(first)).not.toBe(websiteQuotePayloadFingerprint(second));
  });

  it('changes when material nested content changes', () => {
    const original = { property: { exactFloor: 3 }, request: { frequency: 'WEEKLY' } };
    const changed = { property: { exactFloor: 4 }, request: { frequency: 'WEEKLY' } };
    expect(websiteQuotePayloadFingerprint(original)).not.toBe(websiteQuotePayloadFingerprint(changed));
  });

  it('can compare a retry payload with a previously stored fingerprint', () => {
    const payload = { schemaVersion: '1.0', source: 'HESTIVA_WEBSITE', photos: [] };
    const fingerprint = websiteQuotePayloadFingerprint(payload);
    expect(websiteQuotePayloadMatchesFingerprint(payload, fingerprint.toUpperCase())).toBe(true);
    expect(websiteQuotePayloadMatchesFingerprint({ ...payload, photos: [{}] }, fingerprint)).toBe(false);
  });
});
