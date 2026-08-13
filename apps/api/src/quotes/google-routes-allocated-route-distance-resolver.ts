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

function validCoordinate(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

/**
 * Uses openrouteservice driving distance for the factual road-distance leg.
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

  async resolve(submission: WebsiteQuoteSubmission): Promise<AllocatedRouteDistanceResult> {
    const destination = submission.property.location;
    if (!destination) {
      return {
        allocatedRouteKm: null,
        provenance: 'openrouteservice:v1;destination-coordinates=unresolved',
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
        provenance: 'openrouteservice:v1;coordinates=invalid',
      };
    }

    try {
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
          provenance: `openrouteservice:v1;http-status=${response.status}`,
        };
      }

      const payload = (await response.json()) as OpenRouteServiceResponse;
      const oneWayMeters = payload.routes?.[0]?.summary?.distance;
      if (!Number.isFinite(oneWayMeters) || !oneWayMeters || oneWayMeters <= 0) {
        return {
          allocatedRouteKm: null,
          provenance: 'openrouteservice:v1;distance=missing-or-invalid',
        };
      }

      const isolatedRoundTripKm = (oneWayMeters * 2) / 1000;
      return {
        allocatedRouteKm: isolatedRoundTripKm,
        provenance: `openrouteservice:v1;allocation=isolated-round-trip;one-way-m=${Math.round(oneWayMeters)}`,
      };
    } catch {
      return {
        allocatedRouteKm: null,
        provenance: 'openrouteservice:v1;request-failed',
      };
    }
  }
}
