import { describe, expect, it, jest } from '@jest/globals';
import { HttpException } from '@nestjs/common';
import type { QuoteCustomerEngagementService } from './quote-customer-engagement.service';
import {
  QUOTE_CUSTOMER_ENGAGEMENT_ROUTE_SECURITY,
  QuoteCustomerEngagementPublicController,
} from './quote-customer-engagement.controller';

function responseHarness() {
  const headers = new Map<string, string>();
  return {
    response: { setHeader: (name: string, value: string) => headers.set(name, value) },
    headers,
  };
}

describe('QuoteCustomerEngagementPublicController', () => {
  it('issues a challenge without creating a view and applies private/no-index headers', async () => {
    const issueViewChallenge = jest.fn(async () => ({ challenge: 'B'.repeat(43) }));
    const confirmView = jest.fn();
    const controller = new QuoteCustomerEngagementPublicController({ issueViewChallenge, confirmView } as unknown as QuoteCustomerEngagementService);
    const { response, headers } = responseHarness();

    await controller.issueViewChallenge(`QuoteCapability ${'A'.repeat(43)}`, { socket: { remoteAddress: 'challenge-peer' } }, response);

    expect(issueViewChallenge).toHaveBeenCalledWith('A'.repeat(43));
    expect(confirmView).not.toHaveBeenCalled();
    expect(headers.get('Cache-Control')).toContain('no-store');
    expect(headers.get('X-Robots-Tag')).toContain('noindex');
    expect(headers.get('Referrer-Policy')).toBe('no-referrer');
  });

  it('passes only the opaque capability, challenge and strict visible boolean to confirmation', async () => {
    const issueViewChallenge = jest.fn();
    const confirmView = jest.fn(async () => ({ eventType: 'VIEW_CONFIRMED' }));
    const controller = new QuoteCustomerEngagementPublicController({ issueViewChallenge, confirmView } as unknown as QuoteCustomerEngagementService);
    const { response } = responseHarness();

    await controller.confirmView(
      `QuoteCapability ${'A'.repeat(43)}`,
      'B'.repeat(43),
      true,
      { socket: { remoteAddress: 'confirm-peer' } },
      response,
    );

    expect(confirmView).toHaveBeenCalledWith('A'.repeat(43), 'B'.repeat(43), true);
  });

  it('rate-limits challenge issuance independently from confirmation', async () => {
    const issueViewChallenge = jest.fn(async () => ({ challenge: 'B'.repeat(43) }));
    const confirmView = jest.fn();
    const controller = new QuoteCustomerEngagementPublicController({ issueViewChallenge, confirmView } as unknown as QuoteCustomerEngagementService);

    for (let index = 0; index < QUOTE_CUSTOMER_ENGAGEMENT_ROUTE_SECURITY.challengeRateLimitMax; index += 1) {
      const { response } = responseHarness();
      await controller.issueViewChallenge(`QuoteCapability ${'A'.repeat(43)}`, { socket: { remoteAddress: 'limited-peer' } }, response);
    }
    const { response } = responseHarness();
    await expect(controller.issueViewChallenge(`QuoteCapability ${'A'.repeat(43)}`, { socket: { remoteAddress: 'limited-peer' } }, response)).rejects.toBeInstanceOf(HttpException);
    expect(confirmView).not.toHaveBeenCalled();
  });
});
