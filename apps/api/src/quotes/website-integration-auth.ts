import { createHash, timingSafeEqual } from 'node:crypto';

export const HESTIVA_WEBSITE_INTEGRATION_SECRET_ENV = 'HESTIVA_WEBSITE_INTEGRATION_SECRET' as const;

function extractBearerToken(authorization: unknown): string | null {
  if (typeof authorization !== 'string') return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token ? token : null;
}

function digestSecret(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

export function verifyWebsiteIntegrationAuthorization(
  authorization: unknown,
  configuredSecret: unknown = process.env[HESTIVA_WEBSITE_INTEGRATION_SECRET_ENV],
): boolean {
  const token = extractBearerToken(authorization);
  if (!token || typeof configuredSecret !== 'string' || !configuredSecret) return false;

  return timingSafeEqual(digestSecret(token), digestSecret(configuredSecret));
}
