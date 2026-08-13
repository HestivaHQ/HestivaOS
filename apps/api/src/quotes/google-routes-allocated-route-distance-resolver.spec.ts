import { describe, expect, it, jest } from '@jest/globals';
import { GoogleRoutesAllocatedRouteDistanceResolver } from './google-routes-allocated-route-distance-resolver';
import type { WebsiteQuoteSubmission } from './quote-operational-cost-source';

const submission = {
  property: {
    location: {
      latitude: -26.1076,
      longitude: 28.0567,
    },
  },
} as WebsiteQuoteSubmission;

describe('GoogleRoutesAllocatedRouteDistanceResolver', () => {
  it('uses driving distance and allocates an isolated round trip at quote time', async () => {
    const fetchImpl = jest.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ routes: [{ distanceMeters: 60_000 }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const resolver = new GoogleRoutesAllocatedRouteDistanceResolver({
      apiKey: 'test-key',
      deploymentBaseLatitude: -26.483,
      deploymentBaseLongitude: 27.85,
      fetchImpl,
    });

    const result = await resolver.resolve(submission);

    expect(result.allocatedRouteKm).toBe(120);
    expect(result.provenance).toContain('allocation=isolated-round-trip');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [, request] = fetchImpl.mock.calls[0];
    expect(request?.headers).toMatchObject({
      'X-Goog-FieldMask': 'routes.distanceMeters',
    });
  });

  it('fails closed when website coordinates are absent', async () => {
    const fetchImpl = jest.fn<typeof fetch>();
    const resolver = new GoogleRoutesAllocatedRouteDistanceResolver({
      apiKey: 'test-key',
      deploymentBaseLatitude: -26.483,
      deploymentBaseLongitude: 27.85,
      fetchImpl,
    });

    const result = await resolver.resolve({ property: {} } as WebsiteQuoteSubmission);

    expect(result.allocatedRouteKm).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('fails closed on routing API errors or missing route distance', async () => {
    const resolver = new GoogleRoutesAllocatedRouteDistanceResolver({
      apiKey: 'test-key',
      deploymentBaseLatitude: -26.483,
      deploymentBaseLongitude: 27.85,
      fetchImpl: jest.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 503 })),
    });

    const result = await resolver.resolve(submission);

    expect(result.allocatedRouteKm).toBeNull();
    expect(result.provenance).toContain('http-status=503');
  });
});
