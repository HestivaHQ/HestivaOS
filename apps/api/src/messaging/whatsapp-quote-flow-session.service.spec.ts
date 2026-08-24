import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { MessagingChannel } from '@prisma/client';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { HOMENT_QUOTE_FLOW_COMPLETION, HOMENT_QUOTE_FLOW_CONTRACT, HOMENT_QUOTE_FLOW_JSON_VERSION, HOMENT_QUOTE_FLOW_MAPPING, WhatsAppQuoteFlowSessionService } from './whatsapp-quote-flow-session.service';

const ENV = ['META_WHATSAPP_QUOTE_FLOW_ID','META_WHATSAPP_QUOTE_FLOW_ENABLED'] as const;
const conversationId = '22222222-2222-4222-8222-222222222222';
const messageId = '33333333-3333-4333-8333-333333333333';
const response = () => ({ homent_contract: HOMENT_QUOTE_FLOW_CONTRACT, homent_mapping_version: HOMENT_QUOTE_FLOW_MAPPING, homent_completion_version: HOMENT_QUOTE_FLOW_COMPLETION, property_type: 'HOUSE' });
const row = (extra: Record<string, unknown> = {}) => ({
  id: '11111111-1111-4111-8111-111111111111', conversation_id: conversationId, channel: MessagingChannel.WHATSAPP, provider: 'meta',
  flow_contract_id: HOMENT_QUOTE_FLOW_CONTRACT, mapping_version: HOMENT_QUOTE_FLOW_MAPPING, completion_contract_id: HOMENT_QUOTE_FLOW_COMPLETION,
  provider_flow_artifact_id: 'flow-123', flow_json_version: HOMENT_QUOTE_FLOW_JSON_VERSION, token_fingerprint: 'hash', status: 'OFFERED',
  expires_at: new Date(Date.now() + 60_000), offered_at: new Date(), completed_at: null, launch_message_id: messageId,
  completion_message_id: null, provider_completion_event_key: null, completion_fingerprint: null, completion_evidence: null, ...extra,
}) as any;

describe('WhatsAppQuoteFlowSessionService', () => {
  afterEach(() => { for (const name of ENV) delete process.env[name]; });

  it('fails closed without deployment-owned Flow configuration', async () => {
    await expect(new WhatsAppQuoteFlowSessionService({} as any, {} as any).offer(conversationId)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('creates an opaque launch token while keeping it out of the durable MessagingMessage', async () => {
    process.env.META_WHATSAPP_QUOTE_FLOW_ID = 'flow-123'; process.env.META_WHATSAPP_QUOTE_FLOW_ENABLED = 'true';
    const prepared = row({ status: 'PREPARED', offered_at: null, launch_message_id: null });
    let queries = 0; let sent: any;
    const tx = {
      $executeRaw: jest.fn(async () => 1), $queryRaw: jest.fn(async () => (++queries === 1 ? [] : [prepared])),
      messagingMessage: { findUnique: jest.fn(async () => null), create: jest.fn(async ({ data }: any) => ({ id: messageId, ...data })) },
      messagingMessageStatusEvent: { create: jest.fn(async () => ({})) },
    };
    const prisma = {
      messagingConversation: { findUnique: jest.fn(async () => ({ id: conversationId, channel: MessagingChannel.WHATSAPP, provider: 'meta', providerIdentityId: '27821234567' })) },
      $transaction: jest.fn(async (fn: any) => fn(tx)), $executeRaw: jest.fn(async () => 1),
    };
    const messaging = { send: jest.fn(async (command: any) => { sent = command; return { providerMessageId: 'wamid.flow', acceptedAt: new Date().toISOString() }; }) };
    await new WhatsAppQuoteFlowSessionService(prisma as any, messaging as any).offer(conversationId);
    expect(sent.interactivePayload.action.parameters.flow_token).toEqual(expect.stringMatching(/^[A-Za-z0-9_-]{40,}$/));
    expect(sent.interactivePayload.action.parameters.flow_token).not.toContain(conversationId);
    expect(tx.messagingMessage.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.not.objectContaining({ attachmentMetadata: expect.anything() }) }));
  });

  it('reuses an already offered compatible session', async () => {
    process.env.META_WHATSAPP_QUOTE_FLOW_ID = 'flow-123'; process.env.META_WHATSAPP_QUOTE_FLOW_ENABLED = 'true';
    const active = row(); const tx = { $executeRaw: jest.fn(async () => 1), $queryRaw: jest.fn(async () => [active]) };
    const prisma = { messagingConversation: { findUnique: jest.fn(async () => ({ id: conversationId, channel: MessagingChannel.WHATSAPP, provider: 'meta', providerIdentityId: '27821234567' })) }, $transaction: jest.fn(async (fn: any) => fn(tx)) };
    const messaging = { send: jest.fn() };
    await expect(new WhatsAppQuoteFlowSessionService(prisma as any, messaging as any).offer(conversationId)).resolves.toEqual({ sessionId: active.id, status: 'OFFERED', reused: true });
    expect(messaging.send).not.toHaveBeenCalled();
  });

  it('fails closed for wrong token, conversation, provider, version, or expired session', async () => {
    const cases = [null, row({ conversation_id: '99999999-9999-4999-8999-999999999999' }), row({ provider: 'other' }), row({ mapping_version: 'V2' }), row({ status: 'EXPIRED' })];
    for (const candidate of cases) {
      const tx = { $executeRaw: jest.fn(async () => 1), $queryRaw: jest.fn(async () => candidate ? [candidate] : []) };
      const service = new WhatsAppQuoteFlowSessionService({ $transaction: jest.fn(async (fn: any) => fn(tx)) } as any, {} as any);
      await expect(service.captureCompletion({ id: messageId, conversationId, providerEventKey: 'msg_evt_1' }, { flowToken: 'token', response: response() })).rejects.toBeInstanceOf(ConflictException);
    }
  });

  it('records deliberate guided fallback', async () => {
    const service = new WhatsAppQuoteFlowSessionService({ $executeRaw: jest.fn(async () => 1) } as any, {} as any);
    await expect(service.enterGuidedFallback(conversationId, 'customer requested guided fallback')).resolves.toEqual({ transitioned: true });
  });
});
