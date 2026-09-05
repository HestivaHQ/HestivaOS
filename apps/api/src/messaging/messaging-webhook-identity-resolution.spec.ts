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
  it('runs trusted identity and guided Quote orchestration after durable WhatsApp inbound persistence when Flow does not own the message', async () => {
    const adapter = {
      normalizeInboundWebhook: jest.fn(async () => [inboundEvent]),
      normalizeStatusWebhook: jest.fn(async () => []),
    };
    const messaging = {
      persistInbound: jest.fn(async () => ({ id: 'message-1', conversationId: 'conversation-1' })),
      persistWhatsAppStatus: jest.fn(),
    };
    const inboundMedia = { secureInboundMedia: jest.fn(async () => undefined) };
    const customerLinking = { resolveAndLinkTrustedIdentity: jest.fn(async () => ({ kind: 'MATCHED' })) };
    const quoteOrchestrator = { handleInbound: jest.fn(async () => undefined) };
    const quoteFlowInbound = { handleInbound: jest.fn(async () => false) };
    const controller = new WhatsAppWebhookController(
      adapter as any,
      messaging as any,
      inboundMedia as any,
      customerLinking as any,
      quoteOrchestrator as any,
      quoteFlowInbound as any,
      { automationEnabled: jest.fn(async () => true) } as any,
    );

    const result = await controller.receive({ body: {}, rawBody: Buffer.from('{}') } as any, {});

    expect(result).toEqual({ received: true, normalizedEvents: 1, normalizedStatusEvents: 0 });
    expect(messaging.persistInbound).toHaveBeenCalledWith(inboundEvent);
    expect(customerLinking.resolveAndLinkTrustedIdentity).toHaveBeenCalledWith('conversation-1');
    expect(inboundMedia.secureInboundMedia).toHaveBeenCalledWith('message-1', inboundEvent);
    expect(quoteFlowInbound.handleInbound).toHaveBeenCalledWith('message-1');
    expect(quoteOrchestrator.handleInbound).toHaveBeenCalledWith('message-1');
  });

  it('does not feed Flow-owned WhatsApp inbound into the guided collector', async () => {
    const adapter = { normalizeInboundWebhook: jest.fn(async () => [inboundEvent]), normalizeStatusWebhook: jest.fn(async () => []) };
    const messaging = { persistInbound: jest.fn(async () => ({ id: 'message-flow', conversationId: 'conversation-1' })), persistWhatsAppStatus: jest.fn() };
    const inboundMedia = { secureInboundMedia: jest.fn(async () => undefined) };
    const customerLinking = { resolveAndLinkTrustedIdentity: jest.fn(async () => ({ kind: 'MATCHED' })) };
    const quoteOrchestrator = { handleInbound: jest.fn() };
    const quoteFlowInbound = { handleInbound: jest.fn(async () => true) };
    const controller = new WhatsAppWebhookController(adapter as any, messaging as any, inboundMedia as any, customerLinking as any, quoteOrchestrator as any, quoteFlowInbound as any, { automationEnabled: jest.fn(async () => true) } as any);

    await controller.receive({ body: {}, rawBody: Buffer.from('{}') } as any, {});

    expect(quoteFlowInbound.handleInbound).toHaveBeenCalledWith('message-flow');
    expect(quoteOrchestrator.handleInbound).not.toHaveBeenCalled();
  });

  it('runs trusted identity and Quote orchestration after durable Messenger inbound persistence', async () => {
    const messengerEvent = { ...inboundEvent, channel: 'MESSENGER' };
    const adapter = { normalizeInboundWebhook: jest.fn(async () => [messengerEvent]) };
    const messaging = { persistInbound: jest.fn(async () => ({ id: 'message-2', conversationId: 'conversation-2' })) };
    const customerLinking = { resolveAndLinkTrustedIdentity: jest.fn(async () => ({ kind: 'UNLINKED' })) };
    const quoteOrchestrator = { handleInbound: jest.fn(async () => undefined) };
    const controller = new MessengerWebhookController(adapter as any, messaging as any, customerLinking as any, quoteOrchestrator as any, { automationEnabled: jest.fn(async () => true) } as any);

    const result = await controller.receive({ body: {}, rawBody: Buffer.from('{}') } as any, {});

    expect(result).toEqual({ received: true, normalizedEvents: 1 });
    expect(messaging.persistInbound).toHaveBeenCalledWith(messengerEvent);
    expect(customerLinking.resolveAndLinkTrustedIdentity).toHaveBeenCalledWith('conversation-2');
    expect(quoteOrchestrator.handleInbound).toHaveBeenCalledWith('message-2');
  });

  it('persists WhatsApp inbound and secured media but suppresses Flow and Quote automation during takeover', async () => {
    const adapter = { normalizeInboundWebhook: jest.fn(async () => [inboundEvent]), normalizeStatusWebhook: jest.fn(async () => []) };
    const messaging = { persistInbound: jest.fn(async () => ({ id: 'message-takeover-wa', conversationId: 'conversation-1' })), persistWhatsAppStatus: jest.fn() };
    const inboundMedia = { secureInboundMedia: jest.fn(async () => undefined) };
    const linking = { resolveAndLinkTrustedIdentity: jest.fn(async () => ({ kind: 'UNLINKED' })) };
    const orchestrator = { handleInbound: jest.fn() };
    const flow = { handleInbound: jest.fn() };
    const control = { automationEnabled: jest.fn(async () => false) };
    const controller = new WhatsAppWebhookController(adapter as any, messaging as any, inboundMedia as any, linking as any, orchestrator as any, flow as any, control as any);

    await controller.receive({ body: {}, rawBody: Buffer.from('{}') } as any, {});

    expect(messaging.persistInbound).toHaveBeenCalledTimes(1);
    expect(inboundMedia.secureInboundMedia).toHaveBeenCalledTimes(1);
    expect(flow.handleInbound).not.toHaveBeenCalled();
    expect(orchestrator.handleInbound).not.toHaveBeenCalled();
  });

  it('persists Messenger inbound but suppresses Quote automation during takeover', async () => {
    const event = { ...inboundEvent, channel: 'MESSENGER' };
    const adapter = { normalizeInboundWebhook: jest.fn(async () => [event]) };
    const messaging = { persistInbound: jest.fn(async () => ({ id: 'message-takeover-ms', conversationId: 'conversation-2' })) };
    const linking = { resolveAndLinkTrustedIdentity: jest.fn(async () => ({ kind: 'UNLINKED' })) };
    const orchestrator = { handleInbound: jest.fn() };
    const control = { automationEnabled: jest.fn(async () => false) };
    const controller = new MessengerWebhookController(adapter as any, messaging as any, linking as any, orchestrator as any, control as any);

    await controller.receive({ body: {}, rawBody: Buffer.from('{}') } as any, {});

    expect(messaging.persistInbound).toHaveBeenCalledTimes(1);
    expect(orchestrator.handleInbound).not.toHaveBeenCalled();
  });

  it('does not run identity or Quote orchestration for WhatsApp status-only webhooks', async () => {
    const adapter = { normalizeInboundWebhook: jest.fn(async () => []), normalizeStatusWebhook: jest.fn(async () => [{ providerMessageId: 'provider-message-1' }]) };
    const messaging = { persistInbound: jest.fn(), persistWhatsAppStatus: jest.fn(async () => undefined) };
    const inboundMedia = { secureInboundMedia: jest.fn() };
    const customerLinking = { resolveAndLinkTrustedIdentity: jest.fn() };
    const quoteOrchestrator = { handleInbound: jest.fn() };
    const quoteFlowInbound = { handleInbound: jest.fn() };
    const controller = new WhatsAppWebhookController(adapter as any, messaging as any, inboundMedia as any, customerLinking as any, quoteOrchestrator as any, quoteFlowInbound as any, { automationEnabled: jest.fn(async () => true) } as any);

    await controller.receive({ body: {}, rawBody: Buffer.from('{}') } as any, {});

    expect(customerLinking.resolveAndLinkTrustedIdentity).not.toHaveBeenCalled();
    expect(quoteFlowInbound.handleInbound).not.toHaveBeenCalled();
    expect(quoteOrchestrator.handleInbound).not.toHaveBeenCalled();
    expect(messaging.persistWhatsAppStatus).toHaveBeenCalledTimes(1);
  });
});
