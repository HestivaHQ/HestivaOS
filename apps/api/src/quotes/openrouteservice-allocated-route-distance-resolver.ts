import type {
  AllocatedRouteDistanceResolver,
  AllocatedRouteDistanceResult,
} from './approved-quote-operational-cost-provider';
import type { WebsiteQuoteSubmission } from './quote-operational-cost-source';

export type OpenRouteServiceAllocatedRouteDistanceResolverOptions = {
  apiKey: string;
  deploymentBaseLatitude: number;
  deploymentBaseLongitude: number;
  fetchImpl?: typeof fetch;
};

type OpenRouteServiceResponse = {
  routes?: Array<{ summary?: { distance?: number } }>;
};

type OpenRouteServiceGeocodeResponse = {
  features?: Array<{ geometry?: { coordinates?: [number, number] } }>;
};

function validCoordinate(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

/**
 * Uses openrouteservice driving distance for the factual road-distance leg.
 * Browser GPS coordinates are preferred when supplied. When they are absent,
 * the customer's required service address is geocoded server-side so a quote
 * does not depend on browser location permission or the customer's current
 * physical location.
 *
 * Quote-time allocation is intentionally conservative: until a multi-booking
 * route plan exists, the booking is costed as an isolated base -> property -> base
 * round trip. Later scheduling/clustering may improve the realised economics but
 * must never make the original quote less protected.
 */
export class OpenRouteServiceAllocatedRouteDistanceResolver implements AllocatedRouteDistanceResolver {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: OpenRouteServiceAllocatedRouteDistanceResolverOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private async resolveDestination(
    submission: WebsiteQuoteSubmission,
  ): Promise<{ latitude: number; longitude: number; provenance: string } | null> {
    const supplied = submission.property.location;
    if (supplied) {
      if (
        validCoordinate(supplied.latitude, -90, 90) &&
        validCoordinate(supplied.longitude, -180, 180)
      ) {
        return {
          latitude: supplied.latitude,
          longitude: supplied.longitude,
          provenance: 'destination=gps',
        };
      }
      return null;
    }

    const address = [
      submission.property.addressLine1,
      submission.property.suburb,
      submission.property.postalCode,
      submission.property.country,
    ]
      .filter((value): value is string => Boolean(value?.trim()))
      .join(', ');

    if (!address) return null;

    const url = new URL('https://api.openrouteservice.org/geocode/search');
    url.searchParams.set('api_key', this.options.apiKey);
    url.searchParams.set('text', address);
    url.searchParams.set('boundary.country', 'ZA');
    url.searchParams.set('size', '1');

    const response = await this.fetchImpl(url.toString(), {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as OpenRouteServiceGeocodeResponse;
    const coordinates = payload.features?.[0]?.geometry?.coordinates;
    const longitude = coordinates?.[0];
    const latitude = coordinates?.[1];
    if (
      longitude === undefined ||
      latitude === undefined ||
      !validCoordinate(latitude, -90, 90) ||
      !validCoordinate(longitude, -180, 180)
    ) {
      return null;
    }

    return { latitude, longitude, provenance: 'destination=address-geocode' };
  }

  async resolve(submission: WebsiteQuoteSubmission): Promise<AllocatedRouteDistanceResult> {
    if (
      !validCoordinate(this.options.deploymentBaseLatitude, -90, 90) ||
      !validCoordinate(this.options.deploymentBaseLongitude, -180, 180)
    ) {
      return {
        allocatedRouteKm: null,
        provenance: 'openrouteservice:v1;base-coordinates=invalid',
      };
    }

    try {
      const destination = await this.resolveDestination(submission);
      if (!destination) {
        return {
          allocatedRouteKm: null,
          provenance: 'openrouteservice:v1;destination=unresolved',
        };
      }

      const response = await this.fetchImpl('https://api.heigit.org/openrouteservice/v2/directions/driving-car', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: this.options.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coordinates: [
            [this.options.deploymentBaseLongitude, this.options.deploymentBaseLatitude],
            [destination.longitude, destination.latitude],
          ],
        }),
      });

      if (!response.ok) {
        return {
          allocatedRouteKm: null,
          provenance: `openrouteservice:v1;${destination.provenance};http-status=${response.status}`,
        };
      }

      const payload = (await response.json()) as OpenRouteServiceResponse;
      const oneWayMeters = payload.routes?.[0]?.summary?.distance;
      if (!Number.isFinite(oneWayMeters) || !oneWayMeters || oneWayMeters <= 0) {
        return {
          allocatedRouteKm: null,
          provenance: `openrouteservice:v1;${destination.provenance};distance=missing-or-invalid`,
        };
      }

      const isolatedRoundTripKm = (oneWayMeters * 2) / 1000;
      return {
        allocatedRouteKm: isolatedRoundTripKm,
        provenance: `openrouteservice:v1;${destination.provenance};allocation=isolated-round-trip;one-way-m=${Math.round(oneWayMeters)}`,
      };
    } catch {
      return {
        allocatedRouteKm: null,
        provenance: 'openrouteservice:v1;request-failed',
      };
    }
  }
}
