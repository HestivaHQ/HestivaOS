import { createHash } from 'node:crypto';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, canonicalize(entryValue)]),
    );
  }
  return value;
}

export function canonicalWebsiteQuotePayload(payload: unknown): string {
  return JSON.stringify(canonicalize(payload));
}

export function websiteQuotePayloadFingerprint(payload: unknown): string {
  return createHash('sha256').update(canonicalWebsiteQuotePayload(payload), 'utf8').digest('hex');
}

export function websiteQuotePayloadMatchesFingerprint(payload: unknown, expectedFingerprint: string): boolean {
  return websiteQuotePayloadFingerprint(payload) === expectedFingerprint.toLowerCase();
}
