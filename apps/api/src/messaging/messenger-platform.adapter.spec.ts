import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { createHmac } from 'node:crypto';
import { MessengerPlatformAdapter } from './messenger-platform.adapter';

function context(body: unknown, secret = 'app-secret') {
  const rawBody = Buffer.from(JSON.stringify(body));
  const signature = createHmac('sha256', secret).update(rawBody).digest('hex');
  return { receivedAt: '2026-08-20T17:30:00.000Z', rawBody, headers: { 'x-hub-signature-256': `sha256=${signature}` } };
}

describe('MessengerPlatformAdapter', () => {
  beforeEach(() => {
    process.env.META_APP_SECRET = 'app-secret';
    process.env.META_MESSENGER_WEBHOOK_VERIFY_TOKEN = 'verify-token';
  });

  it('verifies the subscription challenge token', () => {
    const adapter = new MessengerPlatformAdapter();
    expect(adapter.verifySubscription('subscribe', 'verify-token')).toBe(true);
    expect(adapter.verifySubscription('subscribe', 'wrong')).toBe(false);
  });

  it('rejects an invalid webhook signature', async () => {
    const adapter = new MessengerPlatformAdapter();
    const payload = { object: 'page', entry: [] };
    await expect(adapter.normalizeInboundWebhook(payload, { ...context(payload), headers: { 'x-hub-signature-256': 'sha256=' + '00'.repeat(32) } })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('normalizes inbound Messenger text without treating the PSID as a Customer identity', async () => {
    const adapter = new MessengerPlatformAdapter();
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
    const adapter = new MessengerPlatformAdapter();
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
});
