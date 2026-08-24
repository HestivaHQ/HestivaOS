import { describe, expect, it, jest } from '@jest/globals';
import { HttpException } from '@nestjs/common';
import type { QuoteCustomerAccessService } from './quote-customer-access.service';
import {
  QUOTE_CUSTOMER_PUBLIC_ROUTE_SECURITY,
  QuoteCustomerAccessPublicController,
} from './quote-customer-access.controller';

function responseHarness() {
  const headers = new Map<string, string>();
  return {
    response: { setHeader: (name: string, value: string) => headers.set(name, value) },
    headers,
  };
}

describe('QuoteCustomerAccessPublicController', () => {
  it('uses a fixed route credential header and applies no-store/no-index protections', async () => {
    const resolve = jest.fn(async () => ({ ok: true }));
    const controller = new QuoteCustomerAccessPublicController({ resolve } as unknown as QuoteCustomerAccessService);
    const { response, headers } = responseHarness();
    const token = 'A'.repeat(43);
    await controller.resolve(`QuoteCapability ${token}`, { socket: { remoteAddress: 'test-peer-a' } }, response);

    expect(resolve).toHaveBeenCalledWith(token);
    expect(headers.get('Cache-Control')).toContain('no-store');
    expect(headers.get('X-Robots-Tag')).toContain('noindex');
    expect(headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(QUOTE_CUSTOMER_PUBLIC_ROUTE_SECURITY.authorizationScheme).toBe('QuoteCapability');
  });

  it('does not pass malformed Authorization content into token resolution', async () => {
    const resolve = jest.fn(async () => ({ ok: true }));
    const controller = new QuoteCustomerAccessPublicController({ resolve } as unknown as QuoteCustomerAccessService);
    const { response } = responseHarness();
    await controller.resolve('Bearer secret-value', { socket: { remoteAddress: 'test-peer-b' } }, response);
    expect(resolve).toHaveBeenCalledWith('');
  });

  it('rate-limits repeated requests from the same observed transport peer', async () => {
    const resolve = jest.fn(async () => ({ ok: true }));
    const controller = new QuoteCustomerAccessPublicController({ resolve } as unknown as QuoteCustomerAccessService);
    for (let index = 0; index < QUOTE_CUSTOMER_PUBLIC_ROUTE_SECURITY.rateLimitMax; index += 1) {
      const { response } = responseHarness();
      await controller.resolve(`QuoteCapability ${'B'.repeat(43)}`, { socket: { remoteAddress: 'test-peer-c' } }, response);
    }
    const { response } = responseHarness();
    await expect(controller.resolve(`QuoteCapability ${'B'.repeat(43)}`, { socket: { remoteAddress: 'test-peer-c' } }, response)).rejects.toBeInstanceOf(HttpException);
    expect(resolve).toHaveBeenCalledTimes(QUOTE_CUSTOMER_PUBLIC_ROUTE_SECURITY.rateLimitMax);
  });
});
