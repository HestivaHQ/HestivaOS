export const WEBSITE_QUOTE_SCHEMA_VERSION = '1.0' as const;
export const WEBSITE_QUOTE_SOURCE = 'HESTIVA_WEBSITE' as const;
export const WEBSITE_QUOTE_INGESTION_PATH = '/api/integrations/website/quotes' as const;

export const WEBSITE_FREQUENCIES = ['ONE_TIME', 'WEEKLY', 'EVERY_TWO_WEEKS', 'MONTHLY', 'CUSTOM'] as const;
export const WEBSITE_HOME_CONDITIONS = [
  'LIGHT_UPKEEP',
  'STANDARD',
  'EXTRA_ATTENTION',
  'HEAVY_BUILDUP',
  'RECENTLY_RENOVATED',
  'VACANT',
  'MOVE_IN_OUT',
] as const;

export type WebsiteFrequency = (typeof WEBSITE_FREQUENCIES)[number];
export type WebsiteHomeCondition = (typeof WEBSITE_HOME_CONDITIONS)[number];

export type CustomerInput = {
  fullName: string;
  email: string;
  mobile: string;
  preferredContact: 'PHONE' | 'EMAIL' | 'WHATSAPP';
};

export type PropertyInput = {
  propertyType: 'APARTMENT' | 'TOWNHOUSE' | 'HOUSE' | 'DUPLEX' | 'OTHER';
  addressLine1: string;
  suburb: string;
  postalCode?: string;
  country: 'South Africa';
  location?: { latitude: number; longitude: number; accuracyMetres?: number };
  floorSize: 'UNDER_80' | 'FROM_80_TO_150' | 'FROM_151_TO_250' | 'OVER_250' | 'UNKNOWN';
  bedrooms: 'STUDIO' | 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE_PLUS' | 'OTHER';
  bathrooms: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE_PLUS';
  livingAreas: 'ONE' | 'TWO' | 'THREE' | 'FOUR_PLUS';
  storeys?: 'ONE' | 'TWO' | 'THREE' | 'FOUR_PLUS' | 'UNKNOWN';
  outdoorArea: 'NONE' | 'BALCONY' | 'PATIO' | 'BOTH';
  estateClassification: 'NONE' | 'ESTATE' | 'COMPLEX' | 'GATED_COMMUNITY';
  exactFloor?: number;
  buildingAccess?: 'ELEVATOR' | 'STAIRS' | 'ELEVATOR_AND_STAIRS';
};

export type ServiceRequestInput = {
  primaryService: {
    websiteValue: string;
    canonicalService: string | null;
  };
  frequency: WebsiteFrequency;
  customFrequencyNote?: string;
  homeCondition: WebsiteHomeCondition;
  addOns: Array<{
    websiteValue: string;
    canonicalService: string;
    quantity: number;
  }>;
  ecoFriendlyProducts?: boolean;
};

export type VisitPreferenceInput = {
  preferredDate: string;
  alternativeDate?: string;
  preferredTime: 'MORNING' | 'MIDDAY' | 'AFTERNOON' | 'FLEXIBLE';
  flexibility: string;
  urgency: string;
  recurringNotes?: string;
};

export type AccessInput = {
  complexAccess: 'ACCESS_CODE' | 'NOT_APPLICABLE' | 'VISITOR_SIGN_IN' | 'RESIDENT_ARRANGED';
  securityInstructions?: string;
  parking?: string;
  keyHandover: 'SOMEONE_WILL_OPEN' | 'CONCIERGE_RECEPTION' | 'TO_BE_ARRANGED';
  keyHandoverDetails?: string;
  someonePresent: boolean;
};

export type HouseholdInput = {
  hasPets: boolean;
  petType?: string;
  petTemperament?: string;
};

export type SafetyInput = {
  offLimitsAreas?: string;
  fragileItems?: string;
  productRestrictions?: string;
  allergiesOrSensitivities?: string;
  existingDamage?: string;
};

export type QuoteNotesInput = {
  attentionAreas?: string;
  renovationDust?: string;
  applianceNotes?: string;
  additionalNotes?: string;
};

export type QuotePhotoInput = {
  clientPhotoId: string;
  fileName: string;
  contentType: string;
  byteSize: number;
  sha256: string;
  transfer: { kind: 'UPLOAD'; dataBase64: string };
};

export type WebsiteQuoteSubmissionV1 = {
  schemaVersion: typeof WEBSITE_QUOTE_SCHEMA_VERSION;
  submissionId: string;
  source: typeof WEBSITE_QUOTE_SOURCE;
  submittedAt: string;
  customer: CustomerInput;
  property: PropertyInput;
  request: ServiceRequestInput;
  visit: VisitPreferenceInput;
  access: AccessInput;
  household: HouseholdInput;
  safety: SafetyInput;
  notes: QuoteNotesInput;
  photos: QuotePhotoInput[];
};

export type WebsiteQuotePricingLineV1 = {
  code: string;
  label: string;
  quantity: number;
  unitAmountMinor: number;
  lineAmountMinor: number;
};

export type WebsiteQuotePricingSnapshotV1 = {
  currency: 'ZAR';
  subtotalMinor: number;
  adjustmentsMinor: number;
  totalMinor: number;
  lines: WebsiteQuotePricingLineV1[];
};

export type WebsiteQuoteCreatedV1 = {
  schemaVersion: typeof WEBSITE_QUOTE_SCHEMA_VERSION;
  submissionId: string;
  quoteId: string;
  quoteReference: string;
  quoteStatus: 'SUBMITTED' | 'NEEDS_ATTENTION';
  created: boolean;
  pricing: WebsiteQuotePricingSnapshotV1;
};

export type WebsiteQuoteContractError = {
  path: string;
  code: string;
  message: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const E164_PATTERN = /^\+[1-9]\d{7,14}$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/i;
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

const PSEUDO_PRIMARY_VALUES = new Set(['Add-on Services', 'Not sure']);
const QUANTITY_ADD_ONS = new Set(['Extra Refrigerator', 'Balcony / Patio Cleaning']);

const FREQUENCY_RULES = new Map<string, readonly WebsiteFrequency[]>([
  ['Move-In Cleaning', ['ONE_TIME']],
  ['Move-Out Cleaning', ['ONE_TIME']],
  ['Regular Home Cleaning', WEBSITE_FREQUENCIES],
  ['Apartment Cleaning', WEBSITE_FREQUENCIES],
  ['Eco-Conscious Cleaning', WEBSITE_FREQUENCIES],
  ['Deep Cleaning', ['ONE_TIME', 'MONTHLY', 'CUSTOM']],
  ['Kitchen Cleaning', ['ONE_TIME', 'CUSTOM']],
  ['Bathroom Sanitisation', ['ONE_TIME', 'CUSTOM']],
  ['Bedroom Cleaning', ['ONE_TIME', 'CUSTOM']],
  ['Living Area Cleaning', ['ONE_TIME', 'CUSTOM']],
  ['Interior Window Cleaning', ['ONE_TIME', 'CUSTOM']],
  ['Laundry Folding', ['ONE_TIME', 'CUSTOM']],
]);

export function allowedFrequenciesForCanonicalService(canonicalService: string | null): readonly WebsiteFrequency[] | null {
  if (canonicalService === null) return ['ONE_TIME', 'CUSTOM'];
  return FREQUENCY_RULES.get(canonicalService) ?? null;
}

function isIsoUtc(value: string) {
  if (!value.endsWith('Z')) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

export function validateWebsiteQuoteSubmissionV1(payload: WebsiteQuoteSubmissionV1): WebsiteQuoteContractError[] {
  const errors: WebsiteQuoteContractError[] = [];
  const add = (path: string, code: string, message: string) => errors.push({ path, code, message });

  if (payload.schemaVersion !== WEBSITE_QUOTE_SCHEMA_VERSION) {
    add('schemaVersion', 'UNSUPPORTED_VERSION', 'Unsupported website quote schema version.');
  }
  if (payload.source !== WEBSITE_QUOTE_SOURCE) add('source', 'INVALID_SOURCE', 'Invalid quote submission source.');
  if (!UUID_PATTERN.test(payload.submissionId)) add('submissionId', 'INVALID_UUID', 'Submission ID must be a UUID.');
  if (!isIsoUtc(payload.submittedAt)) add('submittedAt', 'INVALID_TIMESTAMP', 'Submitted time must be canonical ISO-8601 UTC.');

  if (!payload.customer.fullName.trim()) add('customer.fullName', 'REQUIRED', 'Full name is required.');
  if (!/^\S+@\S+\.\S+$/.test(payload.customer.email.trim())) add('customer.email', 'INVALID_EMAIL', 'Email address is invalid.');
  if (!E164_PATTERN.test(payload.customer.mobile)) add('customer.mobile', 'INVALID_E164', 'Mobile number must be normalized to E.164.');

  if (!payload.property.addressLine1.trim()) add('property.addressLine1', 'REQUIRED', 'Service address is required.');
  if (!payload.property.suburb.trim()) add('property.suburb', 'REQUIRED', 'Suburb is required.');
  if (payload.property.bedrooms === 'STUDIO' && payload.property.propertyType !== 'APARTMENT') {
    add('property.bedrooms', 'INVALID_COMBINATION', 'Studio is valid only for Apartment properties.');
  }
  const unitProperty = payload.property.propertyType === 'APARTMENT' || payload.property.propertyType === 'TOWNHOUSE';
  if (unitProperty && (!Number.isInteger(payload.property.exactFloor) || payload.property.exactFloor! < 0 || payload.property.exactFloor! > 50)) {
    add('property.exactFloor', 'INVALID_EXACT_FLOOR', 'Apartment and Townhouse exact floor must be an integer from 0 to 50.');
  }
  if (unitProperty && !payload.property.buildingAccess) {
    add('property.buildingAccess', 'REQUIRED', 'Building access is required for Apartment and Townhouse properties.');
  }

  const { primaryService } = payload.request;
  if (!primaryService.websiteValue.trim()) add('request.primaryService.websiteValue', 'REQUIRED', 'Website service value is required.');
  if (primaryService.canonicalService === null && !PSEUDO_PRIMARY_VALUES.has(primaryService.websiteValue)) {
    add('request.primaryService.canonicalService', 'UNMAPPED_SERVICE', 'Null canonical service is allowed only for explicit review-required pseudo choices.');
  }
  if (primaryService.canonicalService !== null && PSEUDO_PRIMARY_VALUES.has(primaryService.websiteValue)) {
    add('request.primaryService', 'INVALID_MAPPING', 'Pseudo choices must not map to a canonical Service.');
  }

  const allowedFrequencies = allowedFrequenciesForCanonicalService(primaryService.canonicalService);
  if (allowedFrequencies && !allowedFrequencies.includes(payload.request.frequency)) {
    add('request.frequency', 'INVALID_FOR_SERVICE', 'Frequency is not allowed for the selected primary Service.');
  }
  if (payload.request.frequency === 'CUSTOM' && !payload.request.customFrequencyNote?.trim()) {
    add('request.customFrequencyNote', 'REQUIRED', 'Custom frequency requires a note.');
  }

  const seenAddOns = new Set<string>();
  payload.request.addOns.forEach((addOn, index) => {
    if (!addOn.websiteValue.trim() || !addOn.canonicalService.trim()) {
      add(`request.addOns.${index}`, 'UNMAPPED_ADD_ON', 'Website and canonical add-on values are required.');
    }
    const identity = addOn.canonicalService.trim().toLowerCase();
    if (seenAddOns.has(identity)) add(`request.addOns.${index}.canonicalService`, 'DUPLICATE', 'Duplicate canonical add-on is not allowed.');
    seenAddOns.add(identity);
    if (!Number.isInteger(addOn.quantity) || addOn.quantity < 1) {
      add(`request.addOns.${index}.quantity`, 'INVALID_QUANTITY', 'Add-on quantity must be a positive integer.');
    }
    if (!QUANTITY_ADD_ONS.has(addOn.canonicalService) && addOn.quantity !== 1) {
      add(`request.addOns.${index}.quantity`, 'QUANTITY_NOT_SUPPORTED', 'This add-on must use quantity 1 in contract v1.');
    }
  });

  if (!ISO_DATE_PATTERN.test(payload.visit.preferredDate)) add('visit.preferredDate', 'INVALID_DATE', 'Preferred date must use YYYY-MM-DD.');
  if (payload.visit.alternativeDate && !ISO_DATE_PATTERN.test(payload.visit.alternativeDate)) {
    add('visit.alternativeDate', 'INVALID_DATE', 'Alternative date must use YYYY-MM-DD.');
  }
  if (!payload.visit.flexibility.trim()) add('visit.flexibility', 'REQUIRED', 'Flexibility is required.');
  if (!payload.visit.urgency.trim()) add('visit.urgency', 'REQUIRED', 'Urgency is required.');

  if (payload.access.keyHandover === 'TO_BE_ARRANGED' && !payload.access.keyHandoverDetails?.trim()) {
    add('access.keyHandoverDetails', 'REQUIRED', 'Key handover details are required when handover is to be arranged.');
  }
  if (payload.household.hasPets && !payload.household.petType?.trim()) add('household.petType', 'REQUIRED', 'Pet type is required when pets are present.');
  if (payload.household.hasPets && !payload.household.petTemperament?.trim()) add('household.petTemperament', 'REQUIRED', 'Pet temperament is required when pets are present.');

  if (payload.photos.length > 10) add('photos', 'TOO_MANY', 'A website quote may contain at most 10 customer photos.');
  const photoIds = new Map<string, string>();
  payload.photos.forEach((photo, index) => {
    if (!UUID_PATTERN.test(photo.clientPhotoId)) add(`photos.${index}.clientPhotoId`, 'INVALID_UUID', 'Photo ID must be a UUID.');
    if (!photo.fileName.trim()) add(`photos.${index}.fileName`, 'REQUIRED', 'Photo file name is required.');
    if (!photo.contentType.startsWith('image/')) add(`photos.${index}.contentType`, 'INVALID_CONTENT_TYPE', 'Quote photos must use an image content type.');
    if (!Number.isInteger(photo.byteSize) || photo.byteSize < 1) add(`photos.${index}.byteSize`, 'INVALID_SIZE', 'Photo byte size must be a positive integer.');
    if (!SHA256_PATTERN.test(photo.sha256)) add(`photos.${index}.sha256`, 'INVALID_SHA256', 'Photo SHA-256 must be 64 hexadecimal characters.');
    if (!photo.transfer.dataBase64 || !BASE64_PATTERN.test(photo.transfer.dataBase64)) add(`photos.${index}.transfer.dataBase64`, 'INVALID_BASE64', 'Photo upload data must be valid base64.');
    const previousHash = photoIds.get(photo.clientPhotoId);
    if (previousHash && previousHash !== photo.sha256.toLowerCase()) {
      add(`photos.${index}.clientPhotoId`, 'PHOTO_ID_HASH_CONFLICT', 'The same photo ID cannot identify different content.');
    } else if (previousHash) {
      add(`photos.${index}.clientPhotoId`, 'DUPLICATE', 'Duplicate photo identity is not allowed within one payload.');
    }
    photoIds.set(photo.clientPhotoId, photo.sha256.toLowerCase());
  });

  return errors;
}
