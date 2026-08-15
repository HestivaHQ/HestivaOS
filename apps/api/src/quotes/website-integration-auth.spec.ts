import { describe, expect, it } from '@jest/globals';
import {
  verifyWebsiteIntegrationAuthorization,
  websiteIntegrationSecretFingerprint,
} from './website-integration-auth';

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

  it('returns a stable short fingerprint without exposing the secret', () => {
    const secret = 'server-side-secret-value';
    const fingerprint = websiteIntegrationSecretFingerprint(secret);

    expect(fingerprint).toMatch(/^[a-f0-9]{12}$/);
    expect(fingerprint).toBe(websiteIntegrationSecretFingerprint(secret));
    expect(fingerprint).not.toContain(secret);
    expect(websiteIntegrationSecretFingerprint(undefined)).toBeNull();
  });
});
