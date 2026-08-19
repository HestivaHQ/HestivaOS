export const WEBSITE_ENQUIRY_SCHEMA_VERSION = 'website-enquiry.v1' as const;

export const WEBSITE_ENQUIRY_TYPES = [
  'Request a Quote',
  'General Enquiry',
  'Existing Booking',
  'Service Area Check',
  'Feedback',
] as const;

export type WebsiteEnquiryType = (typeof WEBSITE_ENQUIRY_TYPES)[number];

export type WebsiteEnquirySubmissionV1 = {
  schemaVersion: typeof WEBSITE_ENQUIRY_SCHEMA_VERSION;
  submissionId: string;
  submittedAt: string;
  name: string;
  phone: string;
  email: string;
  enquiryType: WebsiteEnquiryType;
  propertyAddress: string;
  description: string;
  preferredContact: string;
};

export type WebsiteEnquiryValidationError = {
  path: string;
  code: string;
  message: string;
};

const allowedKeys = new Set([
  'schemaVersion',
  'submissionId',
  'submittedAt',
  'name',
  'phone',
  'email',
  'enquiryType',
  'propertyAddress',
  'description',
  'preferredContact',
]);

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateWebsiteEnquirySubmissionV1(payload: unknown): WebsiteEnquiryValidationError[] {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return [{ path: '$', code: 'INVALID_OBJECT', message: 'Website enquiry submission must be a JSON object.' }];
  }

  const value = payload as Record<string, unknown>;
  const errors: WebsiteEnquiryValidationError[] = [];

  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      errors.push({ path: key, code: 'UNKNOWN_FIELD', message: `Unknown field: ${key}.` });
    }
  }

  if (value.schemaVersion !== WEBSITE_ENQUIRY_SCHEMA_VERSION) {
    errors.push({ path: 'schemaVersion', code: 'UNSUPPORTED_VERSION', message: `schemaVersion must be ${WEBSITE_ENQUIRY_SCHEMA_VERSION}.` });
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text(value.submissionId))) {
    errors.push({ path: 'submissionId', code: 'INVALID_UUID', message: 'submissionId must be a UUID.' });
  }

  const submittedAt = text(value.submittedAt);
  if (!submittedAt || Number.isNaN(Date.parse(submittedAt))) {
    errors.push({ path: 'submittedAt', code: 'INVALID_DATETIME', message: 'submittedAt must be an ISO date-time.' });
  }

  const requiredText: Array<[string, number]> = [
    ['name', 200],
    ['phone', 40],
    ['propertyAddress', 500],
    ['description', 10000],
    ['preferredContact', 100],
  ];
  for (const [key, max] of requiredText) {
    const entry = text(value[key]);
    if (!entry || entry.length > max) {
      errors.push({ path: key, code: 'INVALID_TEXT', message: `${key} is required and must be at most ${max} characters.` });
    }
  }

  const email = text(value.email);
  if (!email || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ path: 'email', code: 'INVALID_EMAIL', message: 'email must be a valid email address.' });
  }

  if (!WEBSITE_ENQUIRY_TYPES.includes(value.enquiryType as WebsiteEnquiryType)) {
    errors.push({ path: 'enquiryType', code: 'INVALID_ENQUIRY_TYPE', message: 'enquiryType is not supported.' });
  }

  return errors;
}
