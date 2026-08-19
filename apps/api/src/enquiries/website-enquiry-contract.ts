export const WEBSITE_ENQUIRY_SCHEMA_VERSION = 'website-enquiry.v1' as const;

export const WEBSITE_ENQUIRY_TYPES = [
  'Request a Quote',
  'General Enquiry',
  'Existing Booking',
  'Service Area Check',
  'Feedback',
] as const;

export const WEBSITE_ENQUIRY_PREFERRED_CONTACTS = [
  'Phone',
  'Phone Call',
  'WhatsApp',
  'Email',
  'Not specified',
] as const;

export type WebsiteEnquiryType = (typeof WEBSITE_ENQUIRY_TYPES)[number];
export type WebsiteEnquiryPreferredContact = (typeof WEBSITE_ENQUIRY_PREFERRED_CONTACTS)[number];

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
  preferredContact: WebsiteEnquiryPreferredContact;
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
const PHONE_FORMAT = /^\+?[0-9 ()-]+$/;
const EMAIL_LOCAL = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
const DOMAIN_LABEL = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidPhoneNumber(value: string): boolean {
  if (!value || value.length > 30 || !PHONE_FORMAT.test(value)) return false;
  const compact = value.replace(/[ ()-]/g, '');
  if (/^0\d{9}$/.test(compact)) return true;
  return /^\+[1-9]\d{7,14}$/.test(compact);
}

function isValidEmailAddress(value: string): boolean {
  if (!value || value.length > 254 || /\s/.test(value)) return false;
  const at = value.lastIndexOf('@');
  if (at <= 0 || at !== value.indexOf('@')) return false;
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  if (!local || local.length > 64 || !EMAIL_LOCAL.test(local)) return false;
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  const labels = domain.split('.');
  return labels.length >= 2 && labels.every((label) => DOMAIN_LABEL.test(label)) && labels.at(-1)!.length >= 2;
}

export function validateWebsiteEnquirySubmissionV1(payload: unknown): WebsiteEnquiryValidationError[] {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return [{ path: '$', code: 'INVALID_OBJECT', message: 'Website enquiry submission must be a JSON object.' }];
  }

  const value = payload as Record<string, unknown>;
  const errors: WebsiteEnquiryValidationError[] = [];

  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) errors.push({ path: key, code: 'UNKNOWN_FIELD', message: `Unknown field: ${key}.` });
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

  const name = text(value.name);
  if (name.length < 2 || name.length > 120) errors.push({ path: 'name', code: 'INVALID_NAME', message: 'name must be 2 to 120 characters.' });

  const phone = text(value.phone);
  if (!isValidPhoneNumber(phone)) errors.push({ path: 'phone', code: 'INVALID_PHONE', message: 'phone must match the Website contact-phone contract.' });

  const email = text(value.email);
  if (!isValidEmailAddress(email)) errors.push({ path: 'email', code: 'INVALID_EMAIL', message: 'email must match the Website contact-email contract.' });

  const propertyAddress = text(value.propertyAddress);
  if (propertyAddress.length < 2 || propertyAddress.length > 500) errors.push({ path: 'propertyAddress', code: 'INVALID_PROPERTY_ADDRESS', message: 'propertyAddress must be 2 to 500 characters.' });

  const description = text(value.description);
  if (description.length < 2 || description.length > 5000) errors.push({ path: 'description', code: 'INVALID_DESCRIPTION', message: 'description must be 2 to 5000 characters.' });

  if (!WEBSITE_ENQUIRY_TYPES.includes(value.enquiryType as WebsiteEnquiryType)) {
    errors.push({ path: 'enquiryType', code: 'INVALID_ENQUIRY_TYPE', message: 'enquiryType is not supported.' });
  }

  if (!WEBSITE_ENQUIRY_PREFERRED_CONTACTS.includes(value.preferredContact as WebsiteEnquiryPreferredContact)) {
    errors.push({ path: 'preferredContact', code: 'INVALID_PREFERRED_CONTACT', message: 'preferredContact is not supported.' });
  }

  return errors;
}
