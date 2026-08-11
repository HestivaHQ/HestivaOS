export const WEBSITE_QUOTE_CONTRACT_VERSION = '2026-08-11.v1' as const;

export const WEBSITE_PROPERTY_TYPES = ['Apartment', 'Townhouse', 'House', 'Duplex', 'Other'] as const;
export const WEBSITE_FLOOR_SIZES = ['UNDER_80', 'FROM_80_TO_150', 'FROM_151_TO_250', 'OVER_250', 'UNKNOWN'] as const;
export const WEBSITE_BEDROOM_COUNTS = ['STUDIO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE_PLUS', 'OTHER'] as const;
export const WEBSITE_BATHROOM_COUNTS = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE_PLUS'] as const;
export const WEBSITE_LIVING_AREA_COUNTS = ['ONE', 'TWO', 'THREE', 'FOUR_PLUS'] as const;
export const WEBSITE_STOREY_COUNTS = ['ONE', 'TWO', 'THREE', 'FOUR_PLUS', 'UNKNOWN'] as const;
export const WEBSITE_OUTDOOR_AREAS = ['NONE', 'BALCONY', 'PATIO', 'BOTH'] as const;
export const WEBSITE_ESTATE_CLASSIFICATIONS = ['NONE', 'ESTATE', 'COMPLEX', 'GATED_COMMUNITY'] as const;
export const WEBSITE_UNIT_FLOORS = [
  'GROUND',
  'FIRST',
  'SECOND',
  'THIRD',
  'FOURTH',
  'FIFTH_TO_NINTH',
  'TENTH_PLUS',
  'THIRD_PLUS',
  'UNKNOWN',
] as const;
export const WEBSITE_BUILDING_ACCESS = ['ELEVATOR', 'STAIRS', 'ELEVATOR_AND_STAIRS'] as const;

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
export const WEBSITE_TIME_WINDOWS = ['MORNING', 'MIDDAY', 'AFTERNOON', 'FLEXIBLE'] as const;

export const WEBSITE_PRIMARY_SERVICES = [
  'Regular Home Cleaning',
  'Deep Cleaning',
  'Move-In Cleaning',
  'Move-Out Cleaning',
  'Apartment Cleaning',
  'Kitchen Cleaning',
  'Bathroom Sanitisation',
  'Bedroom Cleaning',
  'Living Area Cleaning',
  'Interior Window Cleaning',
  'Laundry Folding',
  'Eco-Conscious Cleaning',
  'Post-Renovation Cleaning',
] as const;

export const WEBSITE_ADD_ONS = [
  'Inside Oven Cleaning',
  'Inside Fridge Cleaning',
  'Interior Cupboard Cleaning',
  'Interior Window Cleaning',
  'Laundry Folding',
  'Ironing',
  'Bed Making',
  'Linen Change',
  'Balcony / Patio Cleaning',
  'Garage Sweeping',
  'Extra Bathroom Cleaning',
  'Extra Refrigerator',
  'Pet-Hair Treatment',
] as const;

export type WebsitePropertyType = (typeof WEBSITE_PROPERTY_TYPES)[number];
export type WebsiteFloorSize = (typeof WEBSITE_FLOOR_SIZES)[number];
export type WebsiteBedroomCount = (typeof WEBSITE_BEDROOM_COUNTS)[number];
export type WebsiteBathroomCount = (typeof WEBSITE_BATHROOM_COUNTS)[number];
export type WebsiteLivingAreaCount = (typeof WEBSITE_LIVING_AREA_COUNTS)[number];
export type WebsiteStoreyCount = (typeof WEBSITE_STOREY_COUNTS)[number];
export type WebsiteOutdoorArea = (typeof WEBSITE_OUTDOOR_AREAS)[number];
export type WebsiteEstateClassification = (typeof WEBSITE_ESTATE_CLASSIFICATIONS)[number];
export type WebsiteUnitFloor = (typeof WEBSITE_UNIT_FLOORS)[number];
export type WebsiteBuildingAccess = (typeof WEBSITE_BUILDING_ACCESS)[number];
export type WebsiteFrequency = (typeof WEBSITE_FREQUENCIES)[number];
export type WebsiteHomeCondition = (typeof WEBSITE_HOME_CONDITIONS)[number];
export type WebsiteTimeWindow = (typeof WEBSITE_TIME_WINDOWS)[number];
export type WebsitePrimaryService = (typeof WEBSITE_PRIMARY_SERVICES)[number];
export type WebsiteAddOnName = (typeof WEBSITE_ADD_ONS)[number];

export type WebsiteQuotePhotoV1 = {
  transferKey: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes?: number;
};

export type WebsiteQuoteAddOnV1 = {
  name: WebsiteAddOnName;
  quantity: number;
};

export type WebsiteQuoteSubmissionV1 = {
  schemaVersion: typeof WEBSITE_QUOTE_CONTRACT_VERSION;
  submissionKey: string;
  customer: {
    fullName: string;
    email: string;
    mobile: string;
    preferredContactMethod: string;
  };
  property: {
    propertyType: WebsitePropertyType;
    suburb: string;
    addressLine1: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    locationAccuracyMetres?: number;
    floorSize: WebsiteFloorSize;
    bedrooms: WebsiteBedroomCount;
    bathrooms: WebsiteBathroomCount;
    livingAreas: WebsiteLivingAreaCount;
    storeys?: WebsiteStoreyCount;
    outdoorArea: WebsiteOutdoorArea;
    estateClassification: WebsiteEstateClassification;
    unitFloor?: WebsiteUnitFloor;
    buildingAccess?: WebsiteBuildingAccess;
  };
  service: {
    primaryService: WebsitePrimaryService | null;
    unresolvedPrimaryService?: 'ADD_ON_SERVICES' | 'NOT_SURE';
    frequency: WebsiteFrequency;
    customFrequencyNote?: string;
    homeCondition: WebsiteHomeCondition;
    addOns: WebsiteQuoteAddOnV1[];
    ecoFriendlyProducts: boolean;
  };
  visit: {
    preferredDate: string;
    alternativeDate?: string;
    preferredTimeWindow: WebsiteTimeWindow;
    flexibility?: string;
    urgency?: string;
    recurringNotes?: string;
  };
  accessAndHousehold: {
    complexAccessMethod: string;
    securityInstructions?: string;
    parkingNotes?: string;
    keyHandoverMethod: string;
    keyHandoverDetails?: string;
    someonePresent: boolean;
    hasPets: boolean;
    petType?: string;
    petTemperament?: string;
    offLimitsNotes?: string;
    fragileItemNotes?: string;
    productRestrictionNotes?: string;
    allergyNotes?: string;
  };
  notes: {
    attentionAreas?: string;
    existingDamage?: string;
    generalNotes?: string;
  };
  photos: WebsiteQuotePhotoV1[];
};

export type WebsiteQuotePricingLineV1 = {
  type: 'PRIMARY_SERVICE' | 'ADD_ON' | 'ADJUSTMENT';
  code?: string;
  label: string;
  quantity: number;
  unitAmountMinor: number;
  lineTotalMinor: number;
};

export type WebsiteQuoteCreatedV1 = {
  schemaVersion: typeof WEBSITE_QUOTE_CONTRACT_VERSION;
  quoteId: string;
  reference: string;
  revisionNumber: number;
  validUntil: string;
  status: 'SUBMITTED' | 'NEEDS_ATTENTION';
  pricing: {
    currency: 'ZAR';
    subtotalMinor: number;
    discountMinor: number;
    taxEnabled: false;
    taxMinor: 0;
    totalMinor: number;
    lines: WebsiteQuotePricingLineV1[];
  };
};

export type WebsiteQuoteContractError = {
  path: string;
  code: string;
  message: string;
};

const quantityBasedAddOns = new Set<WebsiteAddOnName>([
  'Balcony / Patio Cleaning',
  'Extra Bathroom Cleaning',
  'Extra Refrigerator',
]);

const recurringPrimaryServices = new Set<WebsitePrimaryService>([
  'Regular Home Cleaning',
  'Apartment Cleaning',
  'Eco-Conscious Cleaning',
]);

const monthlyOrCustomPrimaryServices = new Set<WebsitePrimaryService>(['Deep Cleaning']);
const oneTimeOnlyPrimaryServices = new Set<WebsitePrimaryService>(['Move-In Cleaning', 'Move-Out Cleaning', 'Post-Renovation Cleaning']);

export function allowedFrequenciesForWebsiteService(service: WebsitePrimaryService | null): readonly WebsiteFrequency[] {
  if (!service) return ['ONE_TIME', 'CUSTOM'];
  if (oneTimeOnlyPrimaryServices.has(service)) return ['ONE_TIME'];
  if (recurringPrimaryServices.has(service)) return WEBSITE_FREQUENCIES;
  if (monthlyOrCustomPrimaryServices.has(service)) return ['ONE_TIME', 'MONTHLY', 'CUSTOM'];
  return ['ONE_TIME', 'CUSTOM'];
}

export function validateWebsiteQuoteSubmissionV1(payload: WebsiteQuoteSubmissionV1): WebsiteQuoteContractError[] {
  const errors: WebsiteQuoteContractError[] = [];
  const add = (path: string, code: string, message: string) => errors.push({ path, code, message });

  if (payload.schemaVersion !== WEBSITE_QUOTE_CONTRACT_VERSION) {
    add('schemaVersion', 'UNSUPPORTED_VERSION', 'Unsupported website quote contract version.');
  }
  if (!payload.submissionKey.trim()) add('submissionKey', 'REQUIRED', 'Submission key is required.');
  if (!payload.customer.fullName.trim()) add('customer.fullName', 'REQUIRED', 'Full name is required.');
  if (!/^\S+@\S+\.\S+$/.test(payload.customer.email.trim())) add('customer.email', 'INVALID_EMAIL', 'Email address is invalid.');
  if (!payload.customer.mobile.trim()) add('customer.mobile', 'REQUIRED', 'Mobile number is required.');
  if (!payload.property.suburb.trim()) add('property.suburb', 'REQUIRED', 'Suburb is required.');
  if (!payload.property.addressLine1.trim()) add('property.addressLine1', 'REQUIRED', 'Service address is required.');

  if (payload.property.bedrooms === 'STUDIO' && payload.property.propertyType !== 'Apartment') {
    add('property.bedrooms', 'INVALID_COMBINATION', 'Studio is valid only for Apartment properties.');
  }
  if ((payload.property.propertyType === 'Apartment' || payload.property.propertyType === 'Townhouse') && !payload.property.unitFloor) {
    add('property.unitFloor', 'REQUIRED', 'Unit floor is required for Apartment and Townhouse properties.');
  }
  if ((payload.property.propertyType === 'Apartment' || payload.property.propertyType === 'Townhouse') && !payload.property.buildingAccess) {
    add('property.buildingAccess', 'REQUIRED', 'Building access is required for Apartment and Townhouse properties.');
  }

  if (!payload.service.primaryService && !payload.service.unresolvedPrimaryService) {
    add('service.primaryService', 'REQUIRED', 'A canonical primary service or explicit unresolved primary-service state is required.');
  }
  if (payload.service.primaryService && payload.service.unresolvedPrimaryService) {
    add('service', 'CONFLICT', 'Canonical and unresolved primary-service values cannot both be supplied.');
  }
  if (!allowedFrequenciesForWebsiteService(payload.service.primaryService).includes(payload.service.frequency)) {
    add('service.frequency', 'INVALID_FOR_SERVICE', 'Frequency is not allowed for the selected primary service.');
  }
  if (payload.service.frequency === 'CUSTOM' && !payload.service.customFrequencyNote?.trim()) {
    add('service.customFrequencyNote', 'REQUIRED', 'Custom frequency requires a note.');
  }

  const seenAddOns = new Set<WebsiteAddOnName>();
  payload.service.addOns.forEach((addOn, index) => {
    if (seenAddOns.has(addOn.name)) add(`service.addOns.${index}.name`, 'DUPLICATE', 'Duplicate add-on is not allowed.');
    seenAddOns.add(addOn.name);
    if (!Number.isInteger(addOn.quantity) || addOn.quantity < 1) {
      add(`service.addOns.${index}.quantity`, 'INVALID_QUANTITY', 'Add-on quantity must be a positive integer.');
    }
    if (!quantityBasedAddOns.has(addOn.name) && addOn.quantity !== 1) {
      add(`service.addOns.${index}.quantity`, 'QUANTITY_NOT_SUPPORTED', 'This add-on has a fixed quantity of 1.');
    }
  });

  const seenPhotoKeys = new Set<string>();
  payload.photos.forEach((photo, index) => {
    if (!photo.transferKey.trim()) add(`photos.${index}.transferKey`, 'REQUIRED', 'Photo transfer key is required.');
    if (seenPhotoKeys.has(photo.transferKey)) add(`photos.${index}.transferKey`, 'DUPLICATE', 'Photo transfer key must be unique within the submission.');
    seenPhotoKeys.add(photo.transferKey);
    if (!photo.originalFileName.trim()) add(`photos.${index}.originalFileName`, 'REQUIRED', 'Photo file name is required.');
    if (!photo.mimeType.startsWith('image/')) add(`photos.${index}.mimeType`, 'INVALID_MIME_TYPE', 'Quote photos must use an image MIME type.');
  });

  return errors;
}
