import { createHash } from 'node:crypto';
import type { MessagingChannel } from './messaging-contract';

export interface MessagingProviderIdempotencyInput {
  channel: MessagingChannel;
  provider: string;
  providerEventId: string;
}

function requireStableComponent(name: string, value: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${name} must be non-empty`);
  }

  return normalized;
}

/**
 * Produces a durable, non-PII key for one provider event.
 *
 * The provider event identifier remains the upstream replay identity; hashing
 * the canonical tuple prevents raw provider identifiers from becoming a
 * database/business key convention and avoids including customer identifiers.
 */
export function buildMessagingProviderEventKey(
  input: MessagingProviderIdempotencyInput,
): string {
  const provider = requireStableComponent('provider', input.provider).toLowerCase();
  const providerEventId = requireStableComponent(
    'providerEventId',
    input.providerEventId,
  );
  const canonical = [input.channel, provider, providerEventId].join('\u001f');

  return `msg_evt_${createHash('sha256').update(canonical, 'utf8').digest('hex')}`;
}
