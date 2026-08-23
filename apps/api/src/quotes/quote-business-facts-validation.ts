import { POST_EVENT_CLEANING_SERVICE } from './post-event-cleaning-operating-model';
import type { WebsiteQuoteContractError } from './website-quote-contract';
import {
  WEBSITE_QUOTE_SCHEMA_VERSION_V2,
  validateWebsiteQuoteSubmissionV2,
} from './website-quote-contract-v2';
import { WEBSITE_QUOTE_SOURCE } from './website-quote-contract';

const EVENT_TYPES = new Set([
  'PARTY_BIRTHDAY',
  'WEDDING_RECEPTION',
  'FAMILY_GATHERING',
  'CORPORATE_EVENT',
  'FUNERAL_MEMORIAL',
  'OTHER',
]);
const VENUE_TYPES = new Set(['HOME', 'APARTMENT', 'BUSINESS_PREMISES', 'EVENT_VENUE', 'OTHER']);
const GUEST_BANDS = new Set(['ONE_TO_20', 'FROM_21_TO_50', 'FROM_51_TO_100', 'FROM_101_TO_150', 'FROM_150_UP']);
const DISHWASHING = new Set(['NONE', 'MODERATE', 'HEAVY']);
const OUTDOOR_AREAS = new Set(['PATIO', 'BALCONY', 'BRAAI_AREA', 'GARDEN_ENTERTAINMENT_AREA']);
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validationEnvelope(facts: Record<string, unknown>) {
  return {
    schemaVersion: WEBSITE_QUOTE_SCHEMA_VERSION_V2,
    submissionId: '00000000-0000-4000-8000-000000000001',
    source: WEBSITE_QUOTE_SOURCE,
    submittedAt: '2026-01-01T00:00:00.000Z',
    ...facts,
  };
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

/**
 * Validate channel-neutral Quote business facts.
 *
 * Existing Website-compatible facts continue to use the mature Website v2
 * validation surface. Post-Event Cleaning is an internal canonical service that
 * is not yet part of the Website v2 transport contract, so common fields are
 * validated through a transport-neutral projection while the real Post-Event
 * service identity, once-off frequency and structured workload facts are
 * validated explicitly below. The projection is validation-only; it is never
 * returned, persisted, priced or treated as provenance.
 */
export function validateQuoteBusinessFacts(payload: unknown): WebsiteQuoteContractError[] {
  if (!isRecord(payload)) {
    return validateWebsiteQuoteSubmissionV2(validationEnvelope({}));
  }

  const request = isRecord(payload.request) ? payload.request : undefined;
  const primary = request && isRecord(request.primaryService) ? request.primaryService : undefined;
  const postEventSelected =
    primary?.canonicalService === POST_EVENT_CLEANING_SERVICE ||
    primary?.websiteValue === POST_EVENT_CLEANING_SERVICE;

  if (!postEventSelected) {
    const errors = validateWebsiteQuoteSubmissionV2(validationEnvelope(payload));
    if (request?.postEvent !== undefined) {
      errors.push({
        path: 'request.postEvent',
        code: 'POST_EVENT_SERVICE_MISMATCH',
        message: 'Post-Event facts are valid only when Post-Event Cleaning is the selected primary Service.',
      });
    }
    return errors;
  }

  // Validate all common customer/property/request/visit/access/household/safety/
  // notes/photo fields using the mature v2 rules without broadening the Website
  // transport contract to a service it does not yet expose.
  const projectedRequest = request
    ? {
        ...request,
        primaryService: { websiteValue: 'Not sure', canonicalService: null },
        frequency: 'ONE_TIME',
      }
    : request;
  const errors = validateWebsiteQuoteSubmissionV2(validationEnvelope({
    ...payload,
    request: projectedRequest,
  }));

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
