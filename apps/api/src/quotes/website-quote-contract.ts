import { createHash } from 'node:crypto';

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
  floorSize:
    | 'UNDER_40'
    | 'FROM_40_TO_59'
    | 'FROM_60_TO_79'
    | 'FROM_80_TO_99'
    | 'FROM_100_TO_129'
    | 'FROM_130_TO_169'
    | 'FROM_170_TO_219'
    | 'FROM_220_TO_299'
    | 'FROM_300_UP'
    | 'UNKNOWN';
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

type JsonRecord = Record<string, unknown>;
type AddError = (path: string, code: string, message: string) => void;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const E164_PATTERN = /^\+[1-9]\d{7,14}$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/i;
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

const PROPERTY_TYPES = new Set(['APARTMENT', 'TOWNHOUSE', 'HOUSE', 'DUPLEX', 'OTHER']);
const FLOOR_SIZES = new Set([
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
]);
const BEDROOM_COUNTS = new Set(['STUDIO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE_PLUS', 'OTHER']);
const BATHROOM_COUNTS = new Set(['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE_PLUS']);
const LIVING_AREA_COUNTS = new Set(['ONE', 'TWO', 'THREE', 'FOUR_PLUS']);
const STOREY_COUNTS = new Set(['ONE', 'TWO', 'THREE', 'FOUR_PLUS', 'UNKNOWN']);
const OUTDOOR_AREAS = new Set(['NONE', 'BALCONY', 'PATIO', 'BOTH']);
const ESTATE_CLASSIFICATIONS = new Set(['NONE', 'ESTATE', 'COMPLEX', 'GATED_COMMUNITY']);
const BUILDING_ACCESS = new Set(['ELEVATOR', 'STAIRS', 'ELEVATOR_AND_STAIRS']);
const PREFERRED_CONTACT = new Set(['PHONE', 'EMAIL', 'WHATSAPP']);
const PREFERRED_TIMES = new Set(['MORNING', 'MIDDAY', 'AFTERNOON', 'FLEXIBLE']);
const COMPLEX_ACCESS = new Set(['ACCESS_CODE', 'NOT_APPLICABLE', 'VISITOR_SIGN_IN', 'RESIDENT_ARRANGED']);
const KEY_HANDOVER = new Set(['SOMEONE_WILL_OPEN', 'CONCIERGE_RECEPTION', 'TO_BE_ARRANGED']);
const FREQUENCY_VALUES = new Set<string>(WEBSITE_FREQUENCIES);
const HOME_CONDITION_VALUES = new Set<string>(WEBSITE_HOME_CONDITIONS);

const PSEUDO_PRIMARY_VALUES = new Set(['Add-on Services', 'Not sure']);
const PRIMARY_SERVICE_MAP = new Map<string, string>([
  ['Regular Home Cleaning', 'Regular Home Cleaning'],
  ['Deep Cleaning', 'Deep Cleaning'],
  ['Move-In Cleaning', 'Move-In Cleaning'],
  ['Move-Out Cleaning', 'Move-Out Cleaning'],
  ['Apartment Cleaning', 'Apartment Cleaning'],
  ['Kitchen Cleaning', 'Kitchen Cleaning'],
  ['Bathroom Sanitisation', 'Bathroom Sanitisation'],
  ['Bedroom Cleaning', 'Bedroom Cleaning'],
  ['Living Area Cleaning', 'Living Area Cleaning'],
  ['Interior Window Cleaning', 'Interior Window Cleaning'],
  ['Laundry Folding', 'Laundry Folding'],
  ['Eco-Friendly Cleaning', 'Eco-Conscious Cleaning'],
  ['Eco-Conscious Cleaning', 'Eco-Conscious Cleaning'],
  ['Post-Renovation Cleaning', 'Post-Renovation Cleaning'],
]);

const ADD_ON_SERVICE_MAP = new Map<string, string>([
  ['Inside oven', 'Inside Oven Cleaning'],
  ['Inside fridge', 'Inside Fridge Cleaning'],
  ['Inside cupboards', 'Interior Cupboard Cleaning'],
  ['Interior windows', 'Interior Window Cleaning'],
  ['Laundry folding', 'Laundry Folding'],
  ['Ironing', 'Ironing'],
  ['Bed making', 'Bed Making'],
  ['Linen change', 'Linen Change'],
  ['Balcony / Patio Cleaning', 'Balcony / Patio Cleaning'],
  ['Garage sweep', 'Garage Sweeping'],
  ['Extra bathroom', 'Extra Bathroom Cleaning'],
  ['Extra refrigerator', 'Extra Refrigerator'],
  ['Pet-hair treatment', 'Pet-Hair Treatment'],
]);
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

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredRecord(parent: JsonRecord, key: string, path: string, add: AddError): JsonRecord | undefined {
  const value = parent[key];
  if (!isRecord(value)) {
    add(path, 'INVALID_OBJECT', `${path} must be an object.`);
    return undefined;
  }
  return value;
}

function requiredString(parent: JsonRecord, key: string, path: string, add: AddError): string | undefined {
  const value = parent[key];
  if (typeof value !== 'string' || !value.trim()) {
    add(path, 'REQUIRED_STRING', `${path} must be a non-empty string.`);
    return undefined;
  }
  return value;
}

function optionalString(parent: JsonRecord, key: string, path: string, add: AddError): string | undefined {
  const value = parent[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    add(path, 'INVALID_STRING', `${path} must be a string when supplied.`);
    return undefined;
  }
  return value;
}

function requiredBoolean(parent: JsonRecord, key: string, path: string, add: AddError): boolean | undefined {
  const value = parent[key];
  if (typeof value !== 'boolean') {
    add(path, 'INVALID_BOOLEAN', `${path} must be a boolean.`);
    return undefined;
  }
  return value;
}

function optionalBoolean(parent: JsonRecord, key: string, path: string, add: AddError): boolean | undefined {
  const value = parent[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') {
    add(path, 'INVALID_BOOLEAN', `${path} must be a boolean when supplied.`);
    return undefined;
  }
  return value;
}

function enumString(parent: JsonRecord, key: string, path: string, allowed: Set<string>, add: AddError, optional = false): string | undefined {
  const value = parent[key];
  if (value === undefined && optional) return undefined;
  if (typeof value !== 'string' || !allowed.has(value)) {
    add(path, 'INVALID_ENUM', `${path} has an unsupported value.`);
    return undefined;
  }
  return value;
}

function isIsoUtc(value: string) {
  if (!value.endsWith('Z')) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function isCalendarDate(value: string) {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function validateOptionalTextFields(record: JsonRecord | undefined, path: string, keys: string[], add: AddError) {
  if (!record) return;
  keys.forEach((key) => optionalString(record, key, `${path}.${key}`, add));
}

function validateLocation(property: JsonRecord, add: AddError) {
  const value = property.location;
  if (value === undefined) return;
  if (!isRecord(value)) {
    add('property.location', 'INVALID_OBJECT', 'property.location must be an object when supplied.');
    return;
  }
  const latitude = value.latitude;
  const longitude = value.longitude;
  if (typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    add('property.location.latitude', 'INVALID_LATITUDE', 'Latitude must be a finite number from -90 to 90.');
  }
  if (typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    add('property.location.longitude', 'INVALID_LONGITUDE', 'Longitude must be a finite number from -180 to 180.');
  }
  if (value.accuracyMetres !== undefined && (typeof value.accuracyMetres !== 'number' || !Number.isFinite(value.accuracyMetres) || value.accuracyMetres < 0)) {
    add('property.location.accuracyMetres', 'INVALID_ACCURACY', 'Location accuracy must be a non-negative finite number.');
  }
}

function validatePhoto(photo: unknown, index: number, photoIds: Map<string, string>, add: AddError) {
  const path = `photos.${index}`;
  if (!isRecord(photo)) {
    add(path, 'INVALID_OBJECT', 'Each photo must be an object.');
    return;
  }
  const clientPhotoId = requiredString(photo, 'clientPhotoId', `${path}.clientPhotoId`, add);
  const fileName = requiredString(photo, 'fileName', `${path}.fileName`, add);
  const contentType = requiredString(photo, 'contentType', `${path}.contentType`, add);
  const sha256 = requiredString(photo, 'sha256', `${path}.sha256`, add);
  const byteSize = photo.byteSize;
  const transfer = requiredRecord(photo, 'transfer', `${path}.transfer`, add);

  if (clientPhotoId && !UUID_PATTERN.test(clientPhotoId)) add(`${path}.clientPhotoId`, 'INVALID_UUID', 'Photo ID must be a UUID.');
  if (fileName && !fileName.trim()) add(`${path}.fileName`, 'REQUIRED', 'Photo file name is required.');
  if (contentType && !contentType.startsWith('image/')) add(`${path}.contentType`, 'INVALID_CONTENT_TYPE', 'Quote photos must use an image content type.');
  if (!Number.isInteger(byteSize) || (byteSize as number) < 1) add(`${path}.byteSize`, 'INVALID_SIZE', 'Photo byte size must be a positive integer.');
  if (sha256 && !SHA256_PATTERN.test(sha256)) add(`${path}.sha256`, 'INVALID_SHA256', 'Photo SHA-256 must be 64 hexadecimal characters.');

  let dataBase64: string | undefined;
  if (transfer) {
    if (transfer.kind !== 'UPLOAD') add(`${path}.transfer.kind`, 'INVALID_TRANSFER_KIND', 'Photo transfer kind must be UPLOAD.');
    dataBase64 = requiredString(transfer, 'dataBase64', `${path}.transfer.dataBase64`, add);
  }

  let decoded: Buffer | undefined;
  if (dataBase64) {
    if (!BASE64_PATTERN.test(dataBase64)) {
      add(`${path}.transfer.dataBase64`, 'INVALID_BASE64', 'Photo upload data must be valid canonical base64.');
    } else {
      decoded = Buffer.from(dataBase64, 'base64');
      if (decoded.toString('base64') !== dataBase64) {
        add(`${path}.transfer.dataBase64`, 'INVALID_BASE64', 'Photo upload data must be canonical base64.');
      }
    }
  }

  if (decoded && Number.isInteger(byteSize) && byteSize !== decoded.length) {
    add(`${path}.byteSize`, 'BYTE_SIZE_MISMATCH', 'Photo byte size does not match received upload bytes.');
  }
  if (decoded && sha256 && SHA256_PATTERN.test(sha256)) {
    const actualHash = createHash('sha256').update(decoded).digest('hex');
    if (actualHash !== sha256.toLowerCase()) add(`${path}.sha256`, 'SHA256_MISMATCH', 'Photo SHA-256 does not match received upload bytes.');
  }

  if (clientPhotoId && sha256 && SHA256_PATTERN.test(sha256)) {
    const normalizedHash = sha256.toLowerCase();
    const previousHash = photoIds.get(clientPhotoId);
    if (previousHash && previousHash !== normalizedHash) {
      add(`${path}.clientPhotoId`, 'PHOTO_ID_HASH_CONFLICT', 'The same photo ID cannot identify different content.');
    } else if (previousHash) {
      add(`${path}.clientPhotoId`, 'DUPLICATE', 'Duplicate photo identity is not allowed within one payload.');
    } else {
      photoIds.set(clientPhotoId, normalizedHash);
    }
  }
}

export function validateWebsiteQuoteSubmissionV1(payload: unknown): WebsiteQuoteContractError[] {
  const errors: WebsiteQuoteContractError[] = [];
  const add: AddError = (path, code, message) => errors.push({ path, code, message });

  if (!isRecord(payload)) {
    add('$', 'INVALID_OBJECT', 'Website Quote submission must be a JSON object.');
    return errors;
  }

  if (payload.schemaVersion !== WEBSITE_QUOTE_SCHEMA_VERSION) add('schemaVersion', 'UNSUPPORTED_VERSION', 'Unsupported website quote schema version.');
  if (payload.source !== WEBSITE_QUOTE_SOURCE) add('source', 'INVALID_SOURCE', 'Invalid quote submission source.');
  const submissionId = requiredString(payload, 'submissionId', 'submissionId', add);
  const submittedAt = requiredString(payload, 'submittedAt', 'submittedAt', add);
  if (submissionId && !UUID_PATTERN.test(submissionId)) add('submissionId', 'INVALID_UUID', 'Submission ID must be a UUID.');
  if (submittedAt && !isIsoUtc(submittedAt)) add('submittedAt', 'INVALID_TIMESTAMP', 'Submitted time must be canonical ISO-8601 UTC.');

  const customer = requiredRecord(payload, 'customer', 'customer', add);
  if (customer) {
    const fullName = requiredString(customer, 'fullName', 'customer.fullName', add);
    const email = requiredString(customer, 'email', 'customer.email', add);
    const mobile = requiredString(customer, 'mobile', 'customer.mobile', add);
    enumString(customer, 'preferredContact', 'customer.preferredContact', PREFERRED_CONTACT, add);
    if (fullName && !fullName.trim()) add('customer.fullName', 'REQUIRED', 'Full name is required.');
    if (email && !/^\S+@\S+\.\S+$/.test(email.trim())) add('customer.email', 'INVALID_EMAIL', 'Email address is invalid.');
    if (mobile && !E164_PATTERN.test(mobile)) add('customer.mobile', 'INVALID_E164', 'Mobile number must be normalized to E.164.');
  }

  const property = requiredRecord(payload, 'property', 'property', add);
  let propertyType: string | undefined;
  if (property) {
    propertyType = enumString(property, 'propertyType', 'property.propertyType', PROPERTY_TYPES, add);
    requiredString(property, 'addressLine1', 'property.addressLine1', add);
    requiredString(property, 'suburb', 'property.suburb', add);
    optionalString(property, 'postalCode', 'property.postalCode', add);
    if (property.country !== 'South Africa') add('property.country', 'INVALID_COUNTRY', 'Property country must be South Africa in contract v1.');
    enumString(property, 'floorSize', 'property.floorSize', FLOOR_SIZES, add);
    const bedrooms = enumString(property, 'bedrooms', 'property.bedrooms', BEDROOM_COUNTS, add);
    enumString(property, 'bathrooms', 'property.bathrooms', BATHROOM_COUNTS, add);
    enumString(property, 'livingAreas', 'property.livingAreas', LIVING_AREA_COUNTS, add);
    enumString(property, 'storeys', 'property.storeys', STOREY_COUNTS, add, true);
    enumString(property, 'outdoorArea', 'property.outdoorArea', OUTDOOR_AREAS, add);
    enumString(property, 'estateClassification', 'property.estateClassification', ESTATE_CLASSIFICATIONS, add);
    validateLocation(property, add);

    if (bedrooms === 'STUDIO' && propertyType !== 'APARTMENT') add('property.bedrooms', 'INVALID_COMBINATION', 'Studio is valid only for Apartment properties.');
    const unitProperty = propertyType === 'APARTMENT' || propertyType === 'TOWNHOUSE';
    if (unitProperty) {
      if (!Number.isInteger(property.exactFloor) || (property.exactFloor as number) < 0 || (property.exactFloor as number) > 50) {
        add('property.exactFloor', 'INVALID_EXACT_FLOOR', 'Apartment and Townhouse exact floor must be an integer from 0 to 50.');
      }
      enumString(property, 'buildingAccess', 'property.buildingAccess', BUILDING_ACCESS, add);
    } else {
      if (property.exactFloor !== undefined && (!Number.isInteger(property.exactFloor) || (property.exactFloor as number) < 0 || (property.exactFloor as number) > 50)) {
        add('property.exactFloor', 'INVALID_EXACT_FLOOR', 'Exact floor must be an integer from 0 to 50 when supplied.');
      }
      enumString(property, 'buildingAccess', 'property.buildingAccess', BUILDING_ACCESS, add, true);
    }
  }

  const request = requiredRecord(payload, 'request', 'request', add);
  let canonicalPrimary: string | null | undefined;
  if (request) {
    const primary = requiredRecord(request, 'primaryService', 'request.primaryService', add);
    if (primary) {
      const websiteValue = requiredString(primary, 'websiteValue', 'request.primaryService.websiteValue', add);
      const rawCanonical = primary.canonicalService;
      if (rawCanonical !== null && typeof rawCanonical !== 'string') {
        add('request.primaryService.canonicalService', 'INVALID_STRING', 'Canonical primary Service must be a string or null.');
      } else {
        canonicalPrimary = rawCanonical;
      }

      if (websiteValue) {
        if (PSEUDO_PRIMARY_VALUES.has(websiteValue)) {
          if (rawCanonical !== null) add('request.primaryService', 'INVALID_MAPPING', 'Pseudo choices must use canonicalService: null.');
        } else {
          const expectedCanonical = PRIMARY_SERVICE_MAP.get(websiteValue);
          if (!expectedCanonical) {
            add('request.primaryService.websiteValue', 'UNMAPPED_SERVICE', 'Website primary Service value is not approved in contract v1.');
          } else if (rawCanonical !== expectedCanonical) {
            add('request.primaryService.canonicalService', 'INVALID_MAPPING', 'Canonical primary Service does not match the approved website mapping.');
          }
        }
      }
    }

    const frequency = enumString(request, 'frequency', 'request.frequency', FREQUENCY_VALUES, add);
    enumString(request, 'homeCondition', 'request.homeCondition', HOME_CONDITION_VALUES, add);
    const customFrequencyNote = optionalString(request, 'customFrequencyNote', 'request.customFrequencyNote', add);
    optionalBoolean(request, 'ecoFriendlyProducts', 'request.ecoFriendlyProducts', add);

    if (frequency === 'CUSTOM' && !customFrequencyNote?.trim()) add('request.customFrequencyNote', 'REQUIRED', 'Custom frequency requires a note.');
    if (frequency && canonicalPrimary !== undefined) {
      const allowedFrequencies = allowedFrequenciesForCanonicalService(canonicalPrimary);
      if (allowedFrequencies && !allowedFrequencies.includes(frequency as WebsiteFrequency)) {
        add('request.frequency', 'INVALID_FOR_SERVICE', 'Frequency is not allowed for the selected primary Service.');
      }
    }

    if (!Array.isArray(request.addOns)) {
      add('request.addOns', 'INVALID_ARRAY', 'request.addOns must be an array.');
    } else {
      const seenCanonicalAddOns = new Set<string>();
      request.addOns.forEach((rawAddOn, index) => {
        const path = `request.addOns.${index}`;
        if (!isRecord(rawAddOn)) {
          add(path, 'INVALID_OBJECT', 'Each add-on must be an object.');
          return;
        }
        const websiteValue = requiredString(rawAddOn, 'websiteValue', `${path}.websiteValue`, add);
        const canonicalService = requiredString(rawAddOn, 'canonicalService', `${path}.canonicalService`, add);
        const quantity = rawAddOn.quantity;
        if (!Number.isInteger(quantity) || (quantity as number) < 1) add(`${path}.quantity`, 'INVALID_QUANTITY', 'Add-on quantity must be a positive integer.');

        if (websiteValue && canonicalService) {
          const expectedCanonical = ADD_ON_SERVICE_MAP.get(websiteValue);
          if (!expectedCanonical) {
            add(`${path}.websiteValue`, 'UNMAPPED_ADD_ON', 'Website add-on value is not approved in contract v1.');
          } else if (canonicalService !== expectedCanonical) {
            add(`${path}.canonicalService`, 'INVALID_MAPPING', 'Canonical add-on does not match the approved website mapping.');
          }

          const identity = canonicalService.toLowerCase();
          if (seenCanonicalAddOns.has(identity)) add(`${path}.canonicalService`, 'DUPLICATE', 'Duplicate canonical add-on is not allowed.');
          seenCanonicalAddOns.add(identity);
          if (Number.isInteger(quantity) && !QUANTITY_ADD_ONS.has(canonicalService) && quantity !== 1) {
            add(`${path}.quantity`, 'QUANTITY_NOT_SUPPORTED', 'This add-on must use quantity 1 in contract v1.');
          }
        }
      });
    }
  }

  const visit = requiredRecord(payload, 'visit', 'visit', add);
  if (visit) {
    const preferredDate = requiredString(visit, 'preferredDate', 'visit.preferredDate', add);
    const alternativeDate = optionalString(visit, 'alternativeDate', 'visit.alternativeDate', add);
    enumString(visit, 'preferredTime', 'visit.preferredTime', PREFERRED_TIMES, add);
    requiredString(visit, 'flexibility', 'visit.flexibility', add);
    requiredString(visit, 'urgency', 'visit.urgency', add);
    optionalString(visit, 'recurringNotes', 'visit.recurringNotes', add);
    if (preferredDate && !isCalendarDate(preferredDate)) add('visit.preferredDate', 'INVALID_DATE', 'Preferred date must be a real calendar date using YYYY-MM-DD.');
    if (alternativeDate && !isCalendarDate(alternativeDate)) add('visit.alternativeDate', 'INVALID_DATE', 'Alternative date must be a real calendar date using YYYY-MM-DD.');
  }

  const access = requiredRecord(payload, 'access', 'access', add);
  if (access) {
    enumString(access, 'complexAccess', 'access.complexAccess', COMPLEX_ACCESS, add);
    validateOptionalTextFields(access, 'access', ['securityInstructions', 'parking', 'keyHandoverDetails'], add);
    const keyHandover = enumString(access, 'keyHandover', 'access.keyHandover', KEY_HANDOVER, add);
    requiredBoolean(access, 'someonePresent', 'access.someonePresent', add);
    if (keyHandover === 'TO_BE_ARRANGED') {
      const details = access.keyHandoverDetails;
      if (typeof details !== 'string' || !details.trim()) add('access.keyHandoverDetails', 'REQUIRED', 'Key handover details are required when handover is to be arranged.');
    }
  }

  const household = requiredRecord(payload, 'household', 'household', add);
  if (household) {
    const hasPets = requiredBoolean(household, 'hasPets', 'household.hasPets', add);
    const petType = optionalString(household, 'petType', 'household.petType', add);
    const petTemperament = optionalString(household, 'petTemperament', 'household.petTemperament', add);
    if (hasPets === true && !petType?.trim()) add('household.petType', 'REQUIRED', 'Pet type is required when pets are present.');
    if (hasPets === true && !petTemperament?.trim()) add('household.petTemperament', 'REQUIRED', 'Pet temperament is required when pets are present.');
  }

  const safety = requiredRecord(payload, 'safety', 'safety', add);
  validateOptionalTextFields(safety, 'safety', ['offLimitsAreas', 'fragileItems', 'productRestrictions', 'allergiesOrSensitivities', 'existingDamage'], add);
  const notes = requiredRecord(payload, 'notes', 'notes', add);
  validateOptionalTextFields(notes, 'notes', ['attentionAreas', 'renovationDust', 'applianceNotes', 'additionalNotes'], add);

  if (!Array.isArray(payload.photos)) {
    add('photos', 'INVALID_ARRAY', 'photos must be an array.');
  } else {
    if (payload.photos.length > 10) add('photos', 'TOO_MANY', 'A website quote may contain at most 10 customer photos.');
    const photoIds = new Map<string, string>();
    payload.photos.forEach((photo, index) => validatePhoto(photo, index, photoIds, add));
  }

  return errors;
}
