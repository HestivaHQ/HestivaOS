import { timingSafeEqual } from 'node:crypto';

export const HESTIVA_WEBSITE_INTEGRATION_SECRET_ENV = 'HESTIVA_WEBSITE_INTEGRATION_SECRET' as const;

function extractBearerToken(authorization: unknown): string | null {
  if (typeof authorization !== 'string') return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token ? token : null;
}

export function verifyWebsiteIntegrationAuthorization(
  authorization: unknown,
  configuredSecret: unknown = process.env[HESTIVA_WEBSITE_INTEGRATION_SECRET_ENV],
): boolean {
  const token = extractBearerToken(authorization);
  if (!token || typeof configuredSecret !== 'string' || !configuredSecret) return false;

  const tokenBuffer = Buffer.from(token, 'utf8');
  const secretBuffer = Buffer.from(configuredSecret, 'utf8');
  if (tokenBuffer.length !== secretBuffer.length) return false;

  return timingSafeEqual(tokenBuffer, secretBuffer);
}
