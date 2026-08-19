import {
  WEBSITE_ENQUIRY_SCHEMA_VERSION,
  validateWebsiteEnquirySubmissionV1,
  type WebsiteEnquirySubmissionV1,
} from './website-enquiry-contract';
import { websiteEnquiryPayloadFingerprint } from './website-enquiry-idempotency';

const valid: WebsiteEnquirySubmissionV1 = {
  schemaVersion: WEBSITE_ENQUIRY_SCHEMA_VERSION,
  submissionId: '2eaa0a85-3480-4c6d-8db2-04cfefb451ec',
  submittedAt: '2026-08-19T06:00:00.000Z',
  name: 'Example Customer',
  phone: '+27 82 000 0000',
  email: 'customer@example.com',
  enquiryType: 'General Enquiry',
  propertyAddress: 'Centurion',
  description: 'Please contact me about your services.',
  preferredContact: 'WhatsApp',
};

describe('website enquiry contract', () => {
  it('accepts the canonical website contact fields', () => {
    expect(validateWebsiteEnquirySubmissionV1(valid)).toEqual([]);
  });

  it('fails closed on unknown fields and unsupported enquiry types', () => {
    const errors = validateWebsiteEnquirySubmissionV1({ ...valid, enquiryType: 'Anything', unexpected: true });
    expect(errors.map((error) => error.code)).toEqual(expect.arrayContaining(['UNKNOWN_FIELD', 'INVALID_ENQUIRY_TYPE']));
  });

  it('fingerprints object keys deterministically', () => {
    const reordered = {
      preferredContact: valid.preferredContact,
      description: valid.description,
      propertyAddress: valid.propertyAddress,
      enquiryType: valid.enquiryType,
      email: valid.email,
      phone: valid.phone,
      name: valid.name,
      submittedAt: valid.submittedAt,
      submissionId: valid.submissionId,
      schemaVersion: valid.schemaVersion,
    };
    expect(websiteEnquiryPayloadFingerprint(reordered)).toBe(websiteEnquiryPayloadFingerprint(valid));
  });
});
