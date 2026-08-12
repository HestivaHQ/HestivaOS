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

export const WEBSITE_QUOTE_SCHEMA_VERSION_V2 = '2.0' as const;

export type WebsiteLaundryRequestV2 = {
  facilities?: LaundryFacilities;
  laundryLoads?: number;
  ironingLoads?: number;
};

export type ServiceRequestInputV2 = Omit<ServiceRequestInput, 'addOns'> & {
  addOns: ServiceRequestInput['addOns'];
  laundry?: WebsiteLaundryRequestV2;
};

export type WebsiteQuoteSubmissionV2 = Omit<WebsiteQuoteSubmissionV1, 'schemaVersion' | 'request'> & {
  schemaVersion: typeof WEBSITE_QUOTE_SCHEMA_VERSION_V2;
  request: ServiceRequestInputV2;
};

const STRUCTURED_LAUNDRY_CANONICAL_SERVICES = new Set(['Laundry', 'Laundry Folding', 'Ironing']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isLaundryFacilities(value: unknown): value is LaundryFacilities {
  return value === 'WASHER_DRYER' || value === 'WASHER_LINE' || value === 'NO_WASHER';
}

/**
 * Validate Quote Submission v2 while reusing the mature v1 validation surface.
 *
 * Laundry and Ironing are intentionally removed from the v1 generic add-on pass:
 * v2 owns them through request.laundry so facilities and quantities cannot be
 * reconstructed from display labels or free text.
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

  const request = isRecord(payload.request) ? payload.request : undefined;
  const addOns = request?.addOns;

  // Reuse v1 validation for every unchanged field and unchanged generic add-on.
  const v1CompatiblePayload: Record<string, unknown> = {
    ...payload,
    schemaVersion: WEBSITE_QUOTE_SCHEMA_VERSION,
  };

  if (request) {
    v1CompatiblePayload.request = {
      ...request,
      addOns: Array.isArray(addOns)
        ? addOns.filter((rawAddOn) => {
            if (!isRecord(rawAddOn)) return true;
            return !STRUCTURED_LAUNDRY_CANONICAL_SERVICES.has(String(rawAddOn.canonicalService || ''));
          })
        : addOns,
    };
  }

  errors.push(
    ...validateWebsiteQuoteSubmissionV1(v1CompatiblePayload).filter(
      (error) => error.path !== 'schemaVersion',
    ),
  );

  if (!request) return errors;

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

  const primary = isRecord(request.primaryService) ? request.primaryService.canonicalService : null;
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
