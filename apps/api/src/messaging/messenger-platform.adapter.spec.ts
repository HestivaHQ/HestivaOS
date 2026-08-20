import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createHmac } from 'node:crypto';
import { MessagingProviderOutcomeUnknownError } from './messaging-provider-adapter';
import { MessengerPlatformAdapter } from './messenger-platform.adapter';

function context(body: unknown, secret = 'app-secret') {
  const rawBody = Buffer.from(JSON.stringify(body));
  const signature = createHmac('sha256', secret).update(rawBody).digest('hex');
  return { receivedAt: '2026-08-20T17:30:00.000Z', rawBody, headers: { 'x-hub-signature-256': `sha256=${signature}` } };
}
function registry() { return { register: jest.fn() }; }

describe('MessengerPlatformAdapter', () => {
  beforeEach(() => {
    process.env.META_APP_SECRET = 'app-secret';
    process.env.META_MESSENGER_WEBHOOK_VERIFY_TOKEN = 'verify-token';
    delete process.env.META_MESSENGER_PAGE_ACCESS_TOKEN;
    delete process.env.META_MESSENGER_PAGE_ID;
    delete process.env.META_GRAPH_API_VERSION;
    jest.restoreAllMocks();
  });

  it('verifies the subscription challenge token', () => {
    const adapter = new MessengerPlatformAdapter(registry() as any);
    expect(adapter.verifySubscription('subscribe', 'verify-token')).toBe(true);
    expect(adapter.verifySubscription('subscribe', 'wrong')).toBe(false);
  });

  it('rejects an invalid webhook signature', async () => {
    const adapter = new MessengerPlatformAdapter(registry() as any);
    const payload = { object: 'page', entry: [] };
    await expect(adapter.normalizeInboundWebhook(payload, { ...context(payload), headers: { 'x-hub-signature-256': 'sha256=' + '00'.repeat(32) } })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('normalizes inbound Messenger text without treating the PSID as a Customer identity', async () => {
    const adapter = new MessengerPlatformAdapter(registry() as any);
    const payload = {
      object: 'page',
      entry: [{ id: 'page-1', messaging: [{ sender: { id: 'psid-1' }, recipient: { id: 'page-1' }, timestamp: 1787247000000, message: { mid: 'm_1', text: 'Hello' } }] }],
    };
    const events = await adapter.normalizeInboundWebhook(payload, context(payload));
    expect(events).toEqual([expect.objectContaining({
      channel: 'MESSENGER', provider: 'meta', providerEventId: 'messenger:m_1', providerMessageId: 'm_1',
      providerConversationId: 'page-1:psid-1', kind: 'TEXT', text: 'Hello', identity: { providerIdentityId: 'psid-1' },
    })]);
  });

  it('normalizes postbacks as interactive events with referral provenance', async () => {
    const adapter = new MessengerPlatformAdapter(registry() as any);
    const payload = {
      object: 'page',
      entry: [{ id: 'page-1', messaging: [{ sender: { id: 'psid-1' }, recipient: { id: 'page-1' }, timestamp: 1787247000000, postback: { title: 'Get quote', payload: 'QUOTE_START', referral: { source: 'SHORTLINK', ref: 'campaign-1' } } }] }],
    };
    const events = await adapter.normalizeInboundWebhook(payload, context(payload));
    expect(events[0]).toEqual(expect.objectContaining({
      channel: 'MESSENGER', kind: 'INTERACTIVE', interactivePayload: { payload: 'QUOTE_START', title: 'Get quote' },
      attribution: expect.objectContaining({ sourceType: 'SHORTLINK', sourceId: 'campaign-1' }),
    }));
  });

  it('registers outbound only when Page send configuration is complete', () => {
    const first = registry();
    new MessengerPlatformAdapter(first as any).onModuleInit();
    expect(first.register).not.toHaveBeenCalled();

    process.env.META_MESSENGER_PAGE_ACCESS_TOKEN = 'page-token';
    process.env.META_MESSENGER_PAGE_ID = 'page-1';
    process.env.META_GRAPH_API_VERSION = 'v99.0';
    const second = registry();
    const adapter = new MessengerPlatformAdapter(second as any);
    adapter.onModuleInit();
    expect(second.register).toHaveBeenCalledWith(adapter);
  });

  it('sends a standard RESPONSE text message through the configured Page', async () => {
    process.env.META_MESSENGER_PAGE_ACCESS_TOKEN = 'page-token';
    process.env.META_MESSENGER_PAGE_ID = 'page-1';
    process.env.META_GRAPH_API_VERSION = 'v99.0';
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ recipient_id: 'psid-1', message_id: 'mid.out-1' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const adapter = new MessengerPlatformAdapter(registry() as any);
    const result = await adapter.send({ channel: 'MESSENGER', provider: 'meta', providerIdentityId: 'psid-1', conversationId: 'conversation-1', idempotencyKey: 'key-1', kind: 'TEXT', text: 'Hello there' });
    expect(result.providerMessageId).toBe('mid.out-1');
    expect(fetchMock).toHaveBeenCalledWith('https://graph.facebook.com/v99.0/page-1/messages', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ recipient: { id: 'psid-1' }, messaging_type: 'RESPONSE', message: { text: 'Hello there' } }),
    }));
  });

  it('treats a provider 5xx as an unknown outcome rather than safe retry failure', async () => {
    process.env.META_MESSENGER_PAGE_ACCESS_TOKEN = 'page-token';
    process.env.META_MESSENGER_PAGE_ID = 'page-1';
    process.env.META_GRAPH_API_VERSION = 'v99.0';
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('', { status: 503 }));
    const adapter = new MessengerPlatformAdapter(registry() as any);
    await expect(adapter.send({ channel: 'MESSENGER', provider: 'meta', providerIdentityId: 'psid-1', conversationId: 'conversation-1', idempotencyKey: 'key-1', kind: 'TEXT', text: 'Hello' })).rejects.toBeInstanceOf(MessagingProviderOutcomeUnknownError);
  });
});
