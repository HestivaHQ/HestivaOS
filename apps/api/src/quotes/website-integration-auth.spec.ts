import { describe, expect, it } from '@jest/globals';
import { verifyWebsiteIntegrationAuthorization } from './website-integration-auth';

describe('website integration authorization', () => {
  it('accepts only the exact configured bearer secret', () => {
    const secret = 'server-side-secret-value';
    expect(verifyWebsiteIntegrationAuthorization(`Bearer ${secret}`, secret)).toBe(true);
    expect(verifyWebsiteIntegrationAuthorization(`bearer ${secret}`, secret)).toBe(true);
    expect(verifyWebsiteIntegrationAuthorization('Bearer wrong-secret-value', secret)).toBe(false);
  });

  it('fails closed when the header or configured secret is missing or malformed', () => {
    expect(verifyWebsiteIntegrationAuthorization(undefined, 'secret')).toBe(false);
    expect(verifyWebsiteIntegrationAuthorization('Basic secret', 'secret')).toBe(false);
    expect(verifyWebsiteIntegrationAuthorization('Bearer ', 'secret')).toBe(false);
    expect(verifyWebsiteIntegrationAuthorization('Bearer secret', undefined)).toBe(false);
    expect(verifyWebsiteIntegrationAuthorization('Bearer secret', '')).toBe(false);
  });

  it('does not accept prefix or suffix matches', () => {
    const secret = 'integration-secret';
    expect(verifyWebsiteIntegrationAuthorization('Bearer integration', secret)).toBe(false);
    expect(verifyWebsiteIntegrationAuthorization('Bearer integration-secret-extra', secret)).toBe(false);
  });
});
