import type { PostEventCleaningRequest } from './post-event-cleaning-operating-model';
import { POST_EVENT_CLEANING_SERVICE } from './post-event-cleaning-operating-model';
import type { WebsiteQuoteContractError } from './website-quote-contract';

export type PostEventEventType =
  | 'PARTY_BIRTHDAY'
  | 'WEDDING_RECEPTION'
  | 'FAMILY_GATHERING'
  | 'CORPORATE_EVENT'
  | 'FUNERAL_MEMORIAL'
  | 'OTHER';

export type PostEventVenueType =
  | 'HOME'
  | 'APARTMENT'
  | 'BUSINESS_PREMISES'
  | 'EVENT_VENUE'
  | 'OTHER';

export type PostEventQuoteFacts = Omit<PostEventCleaningRequest, 'floorSize'> & {
  eventType: PostEventEventType;
  venueType: PostEventVenueType;
};

const EVENT_TYPES = new Set<PostEventEventType>([
  'PARTY_BIRTHDAY',
  'WEDDING_RECEPTION',
  'FAMILY_GATHERING',
  'CORPORATE_EVENT',
  'FUNERAL_MEMORIAL',
  'OTHER',
]);
const VENUE_TYPES = new Set<PostEventVenueType>([
  'HOME',
  'APARTMENT',
  'BUSINESS_PREMISES',
  'EVENT_VENUE',
  'OTHER',
]);
const GUEST_BANDS = new Set([
  'ONE_TO_20',
  'FROM_21_TO_50',
  'FROM_51_TO_100',
  'FROM_101_TO_150',
  'FROM_150_UP',
]);
const DISHWASHING = new Set(['NONE', 'MODERATE', 'HEAVY']);
const OUTDOOR_AREAS = new Set([
  'PATIO',
  'BALCONY',
  'BRAAI_AREA',
  'GARDEN_ENTERTAINMENT_AREA',
]);
const WASTE_LEVELS = new Set(['LIGHT', 'MODERATE', 'HEAVY']);
const POST_EVENT_BOOLEAN_FIELDS = [
  'kitchenSubstantiallyUsed',
  'significantOrdinarySoiling',
  'lateNightOrOvernight',
  'bulkWasteRemovalRequested',
  'specialistContamination',
  'specialistCarpetOrUpholstery',
  'complexVenue',
] as const;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isPostEventPrimaryService(request: Record<string, unknown> | undefined): boolean {
  const primary = request && isRecord(request.primaryService) ? request.primaryService : undefined;
  return (
    primary?.canonicalService === POST_EVENT_CLEANING_SERVICE ||
    primary?.websiteValue === POST_EVENT_CLEANING_SERVICE
  );
}

function addEnumError(
  errors: WebsiteQuoteContractError[],
  record: Record<string, unknown>,
  key: string,
  path: string,
  allowed: Set<string>,
) {
  if (typeof record[key] !== 'string' || !allowed.has(record[key] as string)) {
    errors.push({ path, code: 'INVALID_ENUM', message: `${path} has an unsupported value.` });
  }
}

export function validatePostEventRequestFacts(
  request: Record<string, unknown> | undefined,
): WebsiteQuoteContractError[] {
  const errors: WebsiteQuoteContractError[] = [];
  const primary = request && isRecord(request.primaryService) ? request.primaryService : undefined;

  if (!primary || primary.websiteValue !== POST_EVENT_CLEANING_SERVICE || primary.canonicalService !== POST_EVENT_CLEANING_SERVICE) {
    errors.push({
      path: 'request.primaryService',
      code: 'INVALID_MAPPING',
      message: 'Post-Event Cleaning must use the exact approved canonical Service mapping.',
    });
  }
  if (request?.frequency !== 'ONE_TIME') {
    errors.push({
      path: 'request.frequency',
      code: 'INVALID_FOR_SERVICE',
      message: 'Post-Event Cleaning is once-off only in v1.',
    });
  }

  const postEvent = request?.postEvent;
  if (!isRecord(postEvent)) {
    errors.push({
      path: 'request.postEvent',
      code: 'INVALID_OBJECT',
      message: 'Structured Post-Event facts are required for Post-Event Cleaning.',
    });
    return errors;
  }

  addEnumError(errors, postEvent, 'eventType', 'request.postEvent.eventType', EVENT_TYPES);
  addEnumError(errors, postEvent, 'venueType', 'request.postEvent.venueType', VENUE_TYPES);
  addEnumError(errors, postEvent, 'guestBand', 'request.postEvent.guestBand', GUEST_BANDS);
  addEnumError(errors, postEvent, 'dishwashing', 'request.postEvent.dishwashing', DISHWASHING);
  addEnumError(errors, postEvent, 'wasteLevel', 'request.postEvent.wasteLevel', WASTE_LEVELS);

  if (!Number.isInteger(postEvent.bathrooms) || (postEvent.bathrooms as number) < 1) {
    errors.push({
      path: 'request.postEvent.bathrooms',
      code: 'INVALID_QUANTITY',
      message: 'Post-Event bathroom count must be a positive whole number.',
    });
  }

  const outdoorAreas = postEvent.outdoorAreas;
  if (!Array.isArray(outdoorAreas)) {
    errors.push({
      path: 'request.postEvent.outdoorAreas',
      code: 'INVALID_ARRAY',
      message: 'Post-Event outdoor areas must be an array.',
    });
  } else {
    const seen = new Set<string>();
    outdoorAreas.forEach((area, index) => {
      if (typeof area !== 'string' || !OUTDOOR_AREAS.has(area)) {
        errors.push({
          path: `request.postEvent.outdoorAreas.${index}`,
          code: 'INVALID_ENUM',
          message: 'Unsupported Post-Event outdoor area.',
        });
      } else if (seen.has(area)) {
        errors.push({
          path: `request.postEvent.outdoorAreas.${index}`,
          code: 'DUPLICATE',
          message: 'Duplicate Post-Event outdoor areas are not allowed.',
        });
      } else {
        seen.add(area);
      }
    });
  }

  POST_EVENT_BOOLEAN_FIELDS.forEach((key) => {
    if (typeof postEvent[key] !== 'boolean') {
      errors.push({
        path: `request.postEvent.${key}`,
        code: 'INVALID_BOOLEAN',
        message: `request.postEvent.${key} must be a boolean.`,
      });
    }
  });

  return errors;
}

export function validateNoStrayPostEventFacts(
  request: Record<string, unknown> | undefined,
): WebsiteQuoteContractError[] {
  if (request?.postEvent === undefined) return [];
  return [{
    path: 'request.postEvent',
    code: 'POST_EVENT_SERVICE_MISMATCH',
    message: 'Post-Event facts are valid only when Post-Event Cleaning is the selected primary Service.',
  }];
}
