import { describe, expect, it, jest } from '@jest/globals';
import { MessengerWebhookController } from './messenger-webhook.controller';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';

const inboundEvent = {
  contractVersion: '1.0',
  channel: 'WHATSAPP',
  provider: 'meta',
  providerEventId: 'event-1',
  identity: { providerIdentityId: 'identity-1' },
  occurredAt: '2026-08-21T16:00:00.000Z',
  receivedAt: '2026-08-21T16:00:01.000Z',
  kind: 'TEXT',
  text: 'Hello',
};

describe('webhook trusted identity and Quote orchestration', () => {
  it('runs trusted identity and Quote orchestration after durable WhatsApp inbound persistence', async () => {
    const adapter = {
      normalizeInboundWebhook: jest.fn(async () => [inboundEvent]),
      normalizeStatusWebhook: jest.fn(async () => []),
    };
    const messaging = {
      persistInbound: jest.fn(async () => ({ id: 'message-1', conversationId: 'conversation-1' })),
      persistWhatsAppStatus: jest.fn(),
    };
    const inboundMedia = {
      secureInboundMedia: jest.fn(async () => undefined),
    };
    const customerLinking = {
      resolveAndLinkTrustedIdentity: jest.fn(async () => ({ kind: 'MATCHED' })),
    };
    const quoteOrchestrator = {
      handleInbound: jest.fn(async () => undefined),
    };
    const controller = new WhatsAppWebhookController(
      adapter as any,
      messaging as any,
      inboundMedia as any,
      customerLinking as any,
      quoteOrchestrator as any,
    );

    const result = await controller.receive(
      { body: {}, rawBody: Buffer.from('{}') } as any,
      {},
    );

    expect(result).toEqual({ received: true, normalizedEvents: 1, normalizedStatusEvents: 0 });
    expect(messaging.persistInbound).toHaveBeenCalledWith(inboundEvent);
    expect(customerLinking.resolveAndLinkTrustedIdentity).toHaveBeenCalledWith('conversation-1');
    expect(inboundMedia.secureInboundMedia).toHaveBeenCalledWith('message-1', inboundEvent);
    expect(quoteOrchestrator.handleInbound).toHaveBeenCalledWith('message-1');
  });

  it('runs trusted identity and Quote orchestration after durable Messenger inbound persistence', async () => {
    const messengerEvent = { ...inboundEvent, channel: 'MESSENGER' };
    const adapter = {
      normalizeInboundWebhook: jest.fn(async () => [messengerEvent]),
    };
    const messaging = {
      persistInbound: jest.fn(async () => ({ id: 'message-2', conversationId: 'conversation-2' })),
    };
    const customerLinking = {
      resolveAndLinkTrustedIdentity: jest.fn(async () => ({ kind: 'UNLINKED' })),
    };
    const quoteOrchestrator = {
      handleInbound: jest.fn(async () => undefined),
    };
    const controller = new MessengerWebhookController(
      adapter as any,
      messaging as any,
      customerLinking as any,
      quoteOrchestrator as any,
    );

    const result = await controller.receive(
      { body: {}, rawBody: Buffer.from('{}') } as any,
      {},
    );

    expect(result).toEqual({ received: true, normalizedEvents: 1 });
    expect(messaging.persistInbound).toHaveBeenCalledWith(messengerEvent);
    expect(customerLinking.resolveAndLinkTrustedIdentity).toHaveBeenCalledWith('conversation-2');
    expect(quoteOrchestrator.handleInbound).toHaveBeenCalledWith('message-2');
  });

  it('does not run identity or Quote orchestration for WhatsApp status-only webhooks', async () => {
    const adapter = {
      normalizeInboundWebhook: jest.fn(async () => []),
      normalizeStatusWebhook: jest.fn(async () => [{ providerMessageId: 'provider-message-1' }]),
    };
    const messaging = {
      persistInbound: jest.fn(),
      persistWhatsAppStatus: jest.fn(async () => undefined),
    };
    const inboundMedia = {
      secureInboundMedia: jest.fn(),
    };
    const customerLinking = {
      resolveAndLinkTrustedIdentity: jest.fn(),
    };
    const quoteOrchestrator = {
      handleInbound: jest.fn(),
    };
    const controller = new WhatsAppWebhookController(
      adapter as any,
      messaging as any,
      inboundMedia as any,
      customerLinking as any,
      quoteOrchestrator as any,
    );

    await controller.receive({ body: {}, rawBody: Buffer.from('{}') } as any, {});

    expect(customerLinking.resolveAndLinkTrustedIdentity).not.toHaveBeenCalled();
    expect(quoteOrchestrator.handleInbound).not.toHaveBeenCalled();
    expect(messaging.persistWhatsAppStatus).toHaveBeenCalledTimes(1);
  });
});
