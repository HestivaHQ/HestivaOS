import { BadGatewayException, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { WhatsAppCloudApiAdapter } from './whatsapp-cloud-api.adapter';

const ENV_NAMES = [
  'META_APP_SECRET',
  'META_WHATSAPP_WEBHOOK_VERIFY_TOKEN',
  'META_WHATSAPP_ACCESS_TOKEN',
  'META_WHATSAPP_PHONE_NUMBER_ID',
  'META_GRAPH_API_VERSION',
] as const;

function signedContext(body: Buffer, secret = 'app-secret') {
  return {
    receivedAt: '2026-08-20T15:00:00.000Z',
    rawBody: body,
    headers: {
      'x-hub-signature-256': `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`,
    },
  };
}

function payload() {
  return {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'waba-1',
      changes: [{
        field: 'messages',
        value: {
          metadata: { phone_number_id: 'phone-number-1' },
          messages: [{
            from: '27821234567',
            id: 'wamid.message-1',
            timestamp: '1787238000',
            type: 'text',
            text: { body: 'I need a quote' },
            referral: {
              source_type: 'ad',
              source_id: 'ad-1',
              source_url: 'https://example.invalid/ad',
              ctwa_clid: 'click-1',
              headline: 'Cleaning',
            },
          }],
        },
      }],
    }],
  };
}

describe('WhatsAppCloudApiAdapter', () => {
  const registry = { register: jest.fn() };
  let adapter: WhatsAppCloudApiAdapter;

  beforeEach(() => {
    for (const name of ENV_NAMES) delete process.env[name];
    registry.register.mockClear();
    adapter = new WhatsAppCloudApiAdapter(registry as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    for (const name of ENV_NAMES) delete process.env[name];
  });

  it('verifies the Meta subscription token without exposing it', () => {
    process.env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'verify-me';
    expect(adapter.verifySubscription('subscribe', 'verify-me')).toBe(true);
    expect(adapter.verifySubscription('subscribe', 'wrong')).toBe(false);
    expect(adapter.verifySubscription('unsubscribe', 'verify-me')).toBe(false);
  });

  it('fails closed when the raw-body signature is missing or invalid', async () => {
    process.env.META_APP_SECRET = 'app-secret';
    const body = Buffer.from(JSON.stringify(payload()));
    await expect(adapter.normalizeInboundWebhook(payload(), {
      receivedAt: '2026-08-20T15:00:00.000Z',
      headers: {},
      rawBody: body,
    })).rejects.toBeInstanceOf(UnauthorizedException);

    await expect(adapter.normalizeInboundWebhook(payload(), {
      ...signedContext(body, 'wrong-secret'),
    })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('normalizes a signed inbound text message and preserves referral provenance', async () => {
    process.env.META_APP_SECRET = 'app-secret';
    const providerPayload = payload();
    const body = Buffer.from(JSON.stringify(providerPayload));

    const events = await adapter.normalizeInboundWebhook(providerPayload, signedContext(body));

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(expect.objectContaining({
      channel: 'WHATSAPP',
      provider: 'meta',
      providerEventId: 'message:wamid.message-1',
      providerMessageId: 'wamid.message-1',
      providerConversationId: 'phone-number-1:27821234567',
      kind: 'TEXT',
      text: 'I need a quote',
      identity: {
        providerIdentityId: '27821234567',
        phoneE164: '+27821234567',
      },
      attribution: expect.objectContaining({
        sourceType: 'ad',
        sourceId: 'ad-1',
        clickId: 'click-1',
        headline: 'Cleaning',
      }),
    }));
  });

  it('does not register outbound availability until transport configuration is complete', () => {
    process.env.META_APP_SECRET = 'app-secret';
    process.env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'verify-me';
    adapter.onModuleInit();
    expect(registry.register).not.toHaveBeenCalled();

    process.env.META_WHATSAPP_ACCESS_TOKEN = 'access-token';
    process.env.META_WHATSAPP_PHONE_NUMBER_ID = 'phone-number-1';
    process.env.META_GRAPH_API_VERSION = 'vXX.X';
    adapter.onModuleInit();
    expect(registry.register).toHaveBeenCalledWith(adapter);
  });

  it('sends an authorized text command through the configured Graph endpoint', async () => {
    process.env.META_WHATSAPP_ACCESS_TOKEN = 'access-token';
    process.env.META_WHATSAPP_PHONE_NUMBER_ID = 'phone-number-1';
    process.env.META_GRAPH_API_VERSION = 'vXX.X';
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ messages: [{ id: 'wamid.outbound-1' }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ));

    const result = await adapter.send({
      channel: 'WHATSAPP',
      provider: 'meta',
      providerIdentityId: '27821234567',
      conversationId: 'conversation-1',
      idempotencyKey: 'outbound-1',
      kind: 'TEXT',
      text: 'Hello',
    });

    expect(result.providerMessageId).toBe('wamid.outbound-1');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://graph.facebook.com/vXX.X/phone-number-1/messages',
      expect.objectContaining({ method: 'POST' }),
    );
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(request.headers).toEqual(expect.objectContaining({ Authorization: 'Bearer access-token' }));
    expect(JSON.parse(request.body as string)).toEqual(expect.objectContaining({
      messaging_product: 'whatsapp',
      to: '27821234567',
      type: 'text',
    }));
  });

  it('does not expose Meta error bodies when outbound delivery fails', async () => {
    process.env.META_WHATSAPP_ACCESS_TOKEN = 'access-token';
    process.env.META_WHATSAPP_PHONE_NUMBER_ID = 'phone-number-1';
    process.env.META_GRAPH_API_VERSION = 'vXX.X';
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ error: { message: 'sensitive provider detail' } }),
      { status: 400 },
    ));

    await expect(adapter.send({
      channel: 'WHATSAPP', provider: 'meta', providerIdentityId: '27821234567',
      conversationId: 'conversation-1', idempotencyKey: 'outbound-1', kind: 'TEXT', text: 'Hello',
    })).rejects.toBeInstanceOf(BadGatewayException);
  });
});
