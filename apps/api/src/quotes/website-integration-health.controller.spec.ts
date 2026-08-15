import { afterEach, describe, expect, it } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import { WebsiteIntegrationHealthController } from './website-integration-health.controller';
import { websiteIntegrationSecretFingerprint } from './website-integration-auth';

const originalSecret = process.env.HESTIVA_WEBSITE_INTEGRATION_SECRET;

afterEach(() => {
  if (originalSecret === undefined) delete process.env.HESTIVA_WEBSITE_INTEGRATION_SECRET;
  else process.env.HESTIVA_WEBSITE_INTEGRATION_SECRET = originalSecret;
});

describe('WebsiteIntegrationHealthController', () => {
  it('returns healthy only for the configured bearer secret', () => {
    process.env.HESTIVA_WEBSITE_INTEGRATION_SECRET = 'health-check-secret';
    const controller = new WebsiteIntegrationHealthController();

    expect(controller.health('Bearer health-check-secret')).toEqual({
      ok: true,
      integration: 'website',
      secretFingerprint: websiteIntegrationSecretFingerprint('health-check-secret'),
    });
  });

  it('fails closed for a mismatched bearer secret', () => {
    process.env.HESTIVA_WEBSITE_INTEGRATION_SECRET = 'health-check-secret';
    const controller = new WebsiteIntegrationHealthController();

    expect(() => controller.health('Bearer wrong-secret')).toThrow(UnauthorizedException);
  });
});
