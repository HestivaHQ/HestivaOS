import type {
  AllocatedRouteDistanceResolver,
  AllocatedRouteDistanceResult,
} from './approved-quote-operational-cost-provider';
import type { WebsiteQuoteSubmission } from './quote-operational-cost-source';

export type GoogleRoutesAllocatedRouteDistanceResolverOptions = {
  apiKey: string;
  deploymentBaseLatitude: number;
  deploymentBaseLongitude: number;
  fetchImpl?: typeof fetch;
};

type GoogleRoutesResponse = {
  routes?: Array<{ distanceMeters?: number }>;
};

function validCoordinate(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

/**
 * Uses Google Routes API driving distance for the factual road-distance leg.
 * Quote-time allocation is intentionally conservative: until a multi-booking
 * route plan exists, the booking is costed as an isolated base -> property -> base
 * round trip. Later scheduling/clustering may improve the realised economics but
 * must never make the original quote less protected.
 */
export class GoogleRoutesAllocatedRouteDistanceResolver implements AllocatedRouteDistanceResolver {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: GoogleRoutesAllocatedRouteDistanceResolverOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async resolve(submission: WebsiteQuoteSubmission): Promise<AllocatedRouteDistanceResult> {
    const destination = submission.property.location;
    if (!destination) {
      return {
        allocatedRouteKm: null,
        provenance: 'google-routes:v1;destination-coordinates=unresolved',
      };
    }

    if (
      !validCoordinate(this.options.deploymentBaseLatitude, -90, 90) ||
      !validCoordinate(this.options.deploymentBaseLongitude, -180, 180) ||
      !validCoordinate(destination.latitude, -90, 90) ||
      !validCoordinate(destination.longitude, -180, 180)
    ) {
      return {
        allocatedRouteKm: null,
        provenance: 'google-routes:v1;coordinates=invalid',
      };
    }

    try {
      const response = await this.fetchImpl('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.options.apiKey,
          'X-Goog-FieldMask': 'routes.distanceMeters',
        },
        body: JSON.stringify({
          origin: {
            location: {
              latLng: {
                latitude: this.options.deploymentBaseLatitude,
                longitude: this.options.deploymentBaseLongitude,
              },
            },
          },
          destination: {
            location: {
              latLng: {
                latitude: destination.latitude,
                longitude: destination.longitude,
              },
            },
          },
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_UNAWARE',
          computeAlternativeRoutes: false,
        }),
      });

      if (!response.ok) {
        return {
          allocatedRouteKm: null,
          provenance: `google-routes:v1;http-status=${response.status}`,
        };
      }

      const payload = (await response.json()) as GoogleRoutesResponse;
      const oneWayMeters = payload.routes?.[0]?.distanceMeters;
      if (!Number.isInteger(oneWayMeters) || !oneWayMeters || oneWayMeters <= 0) {
        return {
          allocatedRouteKm: null,
          provenance: 'google-routes:v1;distance=missing-or-invalid',
        };
      }

      const isolatedRoundTripKm = (oneWayMeters * 2) / 1000;
      return {
        allocatedRouteKm: isolatedRoundTripKm,
        provenance: `google-routes:v1;allocation=isolated-round-trip;one-way-m=${oneWayMeters}`,
      };
    } catch {
      return {
        allocatedRouteKm: null,
        provenance: 'google-routes:v1;request-failed',
      };
    }
  }
}
