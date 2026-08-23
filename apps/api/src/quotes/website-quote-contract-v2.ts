import {
  WEBSITE_QUOTE_SCHEMA_VERSION,
  validateWebsiteQuoteSubmissionV1,
  type ServiceRequestInput,
  type WebsiteQuoteContractError,
  type WebsiteQuoteSubmissionV1,
} from './website-quote-contract';
import {
  resolveLaundryRequest,
  type LaundryFacilities,
} from './laundry-operating-model';
import {
  isPostEventPrimaryService,
  isRecord,
  validateNoStrayPostEventFacts,
  validatePostEventRequestFacts,
  type PostEventQuoteFacts,
} from './post-event-cleaning-quote-facts';

export const WEBSITE_QUOTE_SCHEMA_VERSION_V2 = '2.0' as const;

export type WebsiteLaundryRequestV2 = {
  facilities?: LaundryFacilities;
  laundryLoads?: number;
  ironingLoads?: number;
};

export type ServiceRequestInputV2 = Omit<ServiceRequestInput, 'addOns'> & {
  addOns: ServiceRequestInput['addOns'];
  laundry?: WebsiteLaundryRequestV2;
  postEvent?: PostEventQuoteFacts;
};

export type WebsiteQuoteSubmissionV2 = Omit<WebsiteQuoteSubmissionV1, 'schemaVersion' | 'request'> & {
  schemaVersion: typeof WEBSITE_QUOTE_SCHEMA_VERSION_V2;
  request: ServiceRequestInputV2;
};

const STRUCTURED_LAUNDRY_CANONICAL_SERVICES = new Set(['Laundry', 'Laundry Folding', 'Ironing']);
const V2_FULL_RECURRING_SERVICES = new Set(['Bedroom Cleaning', 'Living Area Cleaning']);
const V2_FULL_RECURRING_FREQUENCIES = new Set([
  'ONE_TIME',
  'WEEKLY',
  'EVERY_TWO_WEEKS',
  'MONTHLY',
  'CUSTOM',
]);

function isLaundryFacilities(value: unknown): value is LaundryFacilities {
  return value === 'WASHER_DRYER' || value === 'WASHER_LINE' || value === 'NO_WASHER';
}

/**
 * Validate Quote Submission v2 while reusing the mature v1 validation surface.
 *
 * Laundry and Ironing are intentionally removed from the v1 generic add-on pass:
 * v2 owns them through request.laundry so facilities and quantities cannot be
 * reconstructed from display labels or free text.
 *
 * Post-Event Cleaning is a v2-only primary service. Common Quote fields continue
 * through the mature v1-compatible validation surface, while the exact canonical
 * Post-Event mapping, once-off rule and structured event/workload facts are
 * validated by the shared Post-Event fact validator. Historical v1 behavior is
 * not broadened.
 *
 * Contract v2 also corrects the property-layout model for Townhouses. Exact
 * floor/building-access data remains required for Apartments, while Townhouses
 * are represented by their home storeys and must not inherit the apartment
 * 0-50-floor validation rule.
 *
 * Bedroom Cleaning and Living Area Cleaning use the full recurring frequency
 * vocabulary in v2. Historical v1 validation remains unchanged for backward
 * compatibility.
 */
export function validateWebsiteQuoteSubmissionV2(payload: unknown): WebsiteQuoteContractError[] {
  const errors: WebsiteQuoteContractError[] = [];
  const add = (path: string, code: string, message: string) => errors.push({ path, code, message });

  if (!isRecord(payload)) {
    add('$', 'INVALID_OBJECT', 'Website Quote submission must be a JSON object.');
    return errors;
  }

  if (payload.schemaVersion !== WEBSITE_QUOTE_SCHEMA_VERSION_V2) {
    add('schemaVersion', 'UNSUPPORTED_VERSION', 'Unsupported website quote schema version.');
  }

  const property = isRecord(payload.property) ? payload.property : undefined;
  const townhouse = property?.propertyType === 'TOWNHOUSE';
  const request = isRecord(payload.request) ? payload.request : undefined;
  const postEventSelected = isPostEventPrimaryService(request);
  const addOns = request?.addOns;
  const primary = isRecord(request?.primaryService) ? request.primaryService.canonicalService : null;
  const frequency = request?.frequency;
  const v2FullRecurring =
    typeof primary === 'string' &&
    V2_FULL_RECURRING_SERVICES.has(primary) &&
    typeof frequency === 'string' &&
    V2_FULL_RECURRING_FREQUENCIES.has(frequency);

  // Reuse v1 validation for every unchanged field and unchanged generic add-on.
  // Post-Event itself is projected to the existing review-safe pseudo choice only
  // for this validation pass so v1 remains historically unchanged.
  const v1CompatiblePayload: Record<string, unknown> = {
    ...payload,
    schemaVersion: WEBSITE_QUOTE_SCHEMA_VERSION,
  };

  if (request) {
    const v1CompatibleRequest: Record<string, unknown> = {
      ...request,
      addOns: Array.isArray(addOns)
        ? addOns.filter((rawAddOn) => {
            if (!isRecord(rawAddOn)) return true;
            return !STRUCTURED_LAUNDRY_CANONICAL_SERVICES.has(String(rawAddOn.canonicalService || ''));
          })
        : addOns,
    };
    if (postEventSelected) {
      v1CompatibleRequest.primaryService = { websiteValue: 'Not sure', canonicalService: null };
      v1CompatibleRequest.frequency = 'ONE_TIME';
    }
    v1CompatiblePayload.request = v1CompatibleRequest;
  }

  errors.push(
    ...validateWebsiteQuoteSubmissionV1(v1CompatiblePayload).filter((error) => {
      if (error.path === 'schemaVersion') return false;
      if (
        townhouse &&
        (error.path === 'property.exactFloor' || error.path === 'property.buildingAccess')
      ) {
        return false;
      }
      if (
        v2FullRecurring &&
        error.path === 'request.frequency' &&
        error.code === 'INVALID_FOR_SERVICE'
      ) {
        return false;
      }
      return true;
    }),
  );

  if (!request) return errors;

  errors.push(
    ...(postEventSelected
      ? validatePostEventRequestFacts(request)
      : validateNoStrayPostEventFacts(request)),
  );

  if (Array.isArray(addOns)) {
    addOns.forEach((rawAddOn, index) => {
      if (!isRecord(rawAddOn)) return;
      if (STRUCTURED_LAUNDRY_CANONICAL_SERVICES.has(String(rawAddOn.canonicalService || ''))) {
        add(
          `request.addOns.${index}.canonicalService`,
          'STRUCTURED_LAUNDRY_REQUIRED',
          'Laundry and Ironing must use request.laundry in Quote contract v2.',
        );
      }
    });
  }

  const rawLaundry = request.laundry;
  if (rawLaundry === undefined) return errors;
  if (!isRecord(rawLaundry)) {
    add('request.laundry', 'INVALID_OBJECT', 'request.laundry must be an object when supplied.');
    return errors;
  }

  const facilitiesRaw = rawLaundry.facilities;
  const facilities = facilitiesRaw === undefined
    ? undefined
    : isLaundryFacilities(facilitiesRaw)
      ? facilitiesRaw
      : undefined;
  if (facilitiesRaw !== undefined && !facilities) {
    add('request.laundry.facilities', 'INVALID_ENUM', 'Unsupported laundry facilities value.');
  }

  const laundryLoads = rawLaundry.laundryLoads;
  const ironingLoads = rawLaundry.ironingLoads;
  if (laundryLoads === undefined && ironingLoads === undefined) {
    add(
      'request.laundry',
      'EMPTY_LAUNDRY_REQUEST',
      'request.laundry must request at least Laundry or Ironing.',
    );
    return errors;
  }

  const resolved = resolveLaundryRequest({
    primaryService: typeof primary === 'string' ? primary : null,
    facilities,
    laundryLoads: typeof laundryLoads === 'number' ? laundryLoads : laundryLoads as number | undefined,
    ironingLoads: typeof ironingLoads === 'number' ? ironingLoads : ironingLoads as number | undefined,
  });

  resolved.errors.forEach((error) => {
    const path = error.path === 'primaryService'
      ? 'request.primaryService.canonicalService'
      : `request.laundry.${error.path}`;
    add(path, error.code, error.message);
  });

  return errors;
}
