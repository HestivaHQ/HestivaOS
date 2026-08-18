import { describe, expect, it } from '@jest/globals';
import {
  MESSAGING_CONTRACT_VERSION,
  type NormalizedInboundMessagingEvent,
} from './messaging-contract';
import { buildMessagingProviderEventKey } from './messaging-idempotency';
import type { MessagingProviderAdapter } from './messaging-provider-adapter';

describe('Messaging Foundation v1', () => {
  it('builds stable provider-event keys without customer identity material', () => {
    const first = buildMessagingProviderEventKey({
      channel: 'WHATSAPP',
      provider: 'META',
      providerEventId: 'wamid.provider-event-123',
    });
    const replay = buildMessagingProviderEventKey({
      channel: 'WHATSAPP',
      provider: ' meta ',
      providerEventId: 'wamid.provider-event-123',
    });
    const otherChannel = buildMessagingProviderEventKey({
      channel: 'MESSENGER',
      provider: 'META',
      providerEventId: 'wamid.provider-event-123',
    });

    expect(first).toBe(replay);
    expect(first).not.toBe(otherChannel);
    expect(first).toMatch(/^msg_evt_[a-f0-9]{64}$/);
    expect(first).not.toContain('wamid.provider-event-123');
  });

  it('rejects missing provider replay identity', () => {
    expect(() =>
      buildMessagingProviderEventKey({
        channel: 'WHATSAPP',
        provider: 'META',
        providerEventId: '   ',
      }),
    ).toThrow('providerEventId must be non-empty');
  });

  it('keeps provider adapters on normalized messaging concerns only', async () => {
    const event: NormalizedInboundMessagingEvent = {
      contractVersion: MESSAGING_CONTRACT_VERSION,
      channel: 'WHATSAPP',
      provider: 'META',
      providerEventId: 'event-1',
      providerMessageId: 'message-1',
      identity: {
        providerIdentityId: 'provider-user-1',
        phoneE164: '+27821234567',
      },
      occurredAt: '2026-08-18T12:00:00.000Z',
      receivedAt: '2026-08-18T12:00:01.000Z',
      kind: 'TEXT',
      text: 'I need a quote',
      attribution: {
        sourceType: 'ad',
        sourceId: 'ad-123',
        clickId: 'click-456',
      },
    };

    const adapter: MessagingProviderAdapter = {
      channel: 'WHATSAPP',
      provider: 'META',
      async normalizeInboundWebhook() {
        return [event];
      },
      async send() {
        return {
          providerMessageId: 'outbound-1',
          acceptedAt: '2026-08-18T12:00:02.000Z',
        };
      },
    };

    await expect(
      adapter.normalizeInboundWebhook(
        { providerPayload: true },
        { receivedAt: event.receivedAt, headers: {} },
      ),
    ).resolves.toEqual([event]);

    expect(event.identity.providerIdentityId).toBe('provider-user-1');
    expect(event.attribution?.clickId).toBe('click-456');
  });
});
