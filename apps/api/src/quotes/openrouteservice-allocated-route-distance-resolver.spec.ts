import { describe, expect, it, jest } from '@jest/globals';
import { OpenRouteServiceAllocatedRouteDistanceResolver } from './google-routes-allocated-route-distance-resolver';
import type { WebsiteQuoteSubmission } from './quote-operational-cost-source';

const submission = {
  property: {
    location: {
      latitude: -26.1076,
      longitude: 28.0567,
    },
  },
} as WebsiteQuoteSubmission;

describe('OpenRouteServiceAllocatedRouteDistanceResolver', () => {
  it('uses driving distance and allocates an isolated round trip at quote time', async () => {
    const fetchImpl = jest.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          routes: [
            {
              summary: {
                distance: 60_000,
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const resolver = new OpenRouteServiceAllocatedRouteDistanceResolver({
      apiKey: 'test-key',
      deploymentBaseLatitude: -26.483,
      deploymentBaseLongitude: 27.85,
      fetchImpl,
    });

    const result = await resolver.resolve(submission);

    expect(result.allocatedRouteKm).toBe(120);
    expect(result.provenance).toContain('allocation=isolated-round-trip');
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const [url, request] = fetchImpl.mock.calls[0];

    expect(url).toBe(
      'https://api.heigit.org/openrouteservice/v2/directions/driving-car',
    );

    expect(request?.headers).toMatchObject({
      Authorization: 'test-key',
      'Content-Type': 'application/json',
    });

    const body = JSON.parse(String(request?.body));

    expect(body.coordinates).toEqual([
      [27.85, -26.483],
      [28.0567, -26.1076],
    ]);
  });

  it('fails closed when website coordinates are absent', async () => {
    const fetchImpl = jest.fn<typeof fetch>();

    const resolver = new OpenRouteServiceAllocatedRouteDistanceResolver({
      apiKey: 'test-key',
      deploymentBaseLatitude: -26.483,
      deploymentBaseLongitude: 27.85,
      fetchImpl,
    });

    const result = await resolver.resolve({
      property: {},
    } as WebsiteQuoteSubmission);

    expect(result.allocatedRouteKm).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('fails closed on routing API errors or missing route distance', async () => {
    const resolver = new OpenRouteServiceAllocatedRouteDistanceResolver({
      apiKey: 'test-key',
      deploymentBaseLatitude: -26.483,
      deploymentBaseLongitude: 27.85,
      fetchImpl: jest
        .fn<typeof fetch>()
        .mockResolvedValue(new Response('{}', { status: 503 })),
    });

    const result = await resolver.resolve(submission);

    expect(result.allocatedRouteKm).toBeNull();
    expect(result.provenance).toContain('http-status=503');
  });
});
