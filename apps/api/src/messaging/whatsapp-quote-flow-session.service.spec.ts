import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { MessagingChannel } from '@prisma/client';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
  HOMENT_QUOTE_FLOW_COMPLETION,
  HOMENT_QUOTE_FLOW_CONTRACT,
  HOMENT_QUOTE_FLOW_JSON_VERSION,
  HOMENT_QUOTE_FLOW_MAPPING,
  WhatsAppQuoteFlowSessionService,
} from './whatsapp-quote-flow-session.service';

const ENV_NAMES = ['META_WHATSAPP_QUOTE_FLOW_ID','META_WHATSAPP_QUOTE_FLOW_ENABLED'] as const;
function session(overrides: Record<string, unknown> = {}) {
  return {
    id: '11111111-1111-4111-8111-111111111111', conversation_id: '22222222-2222-4222-8222-222222222222',
    channel: MessagingChannel.WHATSAPP, provider: 'meta', flow_contract_id: HOMENT_QUOTE_FLOW_CONTRACT,
    mapping_version: HOMENT_QUOTE_FLOW_MAPPING, completion_contract_id: HOMENT_QUOTE_FLOW_COMPLETION,
    provider_flow_artifact_id: 'flow-123', flow_json_version: HOMENT_QUOTE_FLOW_JSON_VERSION,
    token_fingerprint: 'fingerprint', status: 'OFFERED', expires_at: new Date(Date.now() + 60_000),
    offered_at: new Date(), completed_at: null, launch_message_id: '33333333-3333-4333-8333-333333333333',
    completion_message_id: null, provider_completion_event_key: null, completion_fingerprint: null, completion_evidence: null,
    ...overrides,
  } as any;
}
function completionResponse() {
  return { homent_contract: HOMENT_QUOTE_FLOW_CONTRACT, homent_mapping_version: HOMENT_QUOTE_FLOW_MAPPING, homent_completion_version: HOMENT_QUOTE_FLOW_COMPLETION, property_type: 'HOUSE' };
}

describe('WhatsAppQuoteFlowSessionService', () => {
  afterEach(() => { for (const name of ENV_NAMES) delete process.env[name]; });

  it('fails closed when the deployment-owned Flow configuration is unavailable', async () => {
    const service = new WhatsAppQuoteFlowSessionService({} as any, {} as any);
    await expect(service.offer('22222222-2222-4222-8222-222222222222')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('generates a high-entropy opaque token for launch but does not persist the raw token in the durable outbound message', async () => {
    process.env.META_WHATSAPP_QUOTE_FLOW_ID = 'flow-123';
    process.env.META_WHATSAPP_QUOTE_FLOW_ENABLED = 'true';
    const createdSession = session({ status: 'PREPARED', offered_at: null, launch_message_id: null, token_fingerprint: 'stored-hash' });
    let queryCount = 0;
    const tx = {
      $executeRaw: jest.fn(async () => 1),
      $queryRaw: jest.fn(async () => { queryCount += 1; return queryCount === 1 ? [] : [createdSession]; }),
      messagingMessage: {
        findUnique: jest.fn(async () => null),
        create: jest.fn(async ({ data }: any) => ({ id: '33333333-3333-4333-8333-333333333333', ...data })),
      },
      messagingMessageStatusEvent: { create: jest.fn(async () => ({})) },
    };
    const prisma = {
      messagingConversation: { findUnique: jest.fn(async () => ({ id: createdSession.conversation_id, channel: MessagingChannel.WHATSAPP, provider: 'meta', providerIdentityId: '27821234567' })) },
      $transaction: jest.fn(async (callback: any) => callback(tx)),
      $executeRaw: jest.fn(async () => 1),
    };
    const messaging = { send: jest.fn(async () => ({ providerMessageId: 'wamid.flow', acceptedAt: new Date().toISOString() })) };
    const service = new WhatsAppQuoteFlowSessionService(prisma as any, messaging as any);

    await service.offer(createdSession.conversation_id);

    const command = messaging.send.mock.calls[0][0] as any;
    const rawToken = command.interactivePayload.action.parameters.flow_token as string;
    expect(rawToken.length).toBeGreaterThanOrEqual(40);
    expect(rawToken).not.toContain(createdSession.conversation_id);
    expect(rawToken).not.toContain('27821234567');
    expect(tx.messagingMessage.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.not.objectContaining({ attachmentMetadata: expect.anything() }) }));
  });

  it('reuses an already offered compatible active session instead of creating a parallel session', async () => {
    process.env.META_WHATSAPP_QUOTE_FLOW_ID = 'flow-123';
    process.env.META_WHATSAPP_QUOTE_FLOW_ENABLED = 'true';
    const active = session();
    const tx = { $executeRaw: jest.fn(async () => 1), $queryRaw: jest.fn(async () => [active]) };
    const prisma = {
      messagingConversation: { findUnique: jest.fn(async () => ({ id: active.conversation_id, channel: MessagingChannel.WHATSAPP, provider: 'meta', providerIdentityId: '27821234567' })) },
      $transaction: jest.fn(async (callback: any) => callback(tx)),
    };
    const messaging = { send: jest.fn() };
    const service = new WhatsAppQuoteFlowSessionService(prisma as any, messaging as any);
    await expect(service.offer(active.conversation_id)).resolves.toEqual({ sessionId: active.id, status: 'OFFERED', reused: true });
    expect(messaging.send).not.toHaveBeenCalled();
  });

  it('rejects a wrong token because no session fingerprint resolves', async () => {
    const tx = { $executeRaw: jest.fn(async () => 1), $queryRaw: jest.fn(async () => []) };
    const prisma = { $transaction: jest.fn(async (callback: any) => callback(tx)) };
    const service = new WhatsAppQuoteFlowSessionService(prisma as any, {} as any);
    await expect(service.captureCompletion(
      { id: '33333333-3333-4333-8333-333333333333', conversationId: '22222222-2222-4222-8222-222222222222', providerEventKey: 'msg_evt_1' },
      { flowToken: 'wrong-token', response: completionResponse() },
    )).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects wrong conversation, provider/version binding, and expired sessions', async () => {
    for (const row of [
      session({ conversation_id: '99999999-9999-4999-8999-999999999999' }),
      session({ provider: 'other' }),
      session({ mapping_version: 'HOMENT_QUOTE_REQUEST_MAPPING_V2' }),
      session({ expires_at: new Date(Date.now() - 60_000) }),
    ]) {
      const tx = { $executeRaw: jest.fn(async () => 1), $queryRaw: jest.fn(async () => [row]) };
      const prisma = { $transaction: jest.fn(async (callback: any) => callback(tx)) };
      const service = new WhatsAppQuoteFlowSessionService(prisma as any, {} as any);
      await expect(service.captureCompletion(
        { id: '33333333-3333-4333-8333-333333333333', conversationId: '22222222-2222-4222-8222-222222222222', providerEventKey: 'msg_evt_1' },
        { flowToken: 'token', response: completionResponse() },
      )).rejects.toBeInstanceOf(ConflictException);
    }
  });

  it('accepts identical completed replay and rejects a materially changed replay', async () => {
    const baseEvidence = { flowTokenFingerprint: 'ignored', providerFlowArtifactId: 'flow-123', flowJsonVersion: HOMENT_QUOTE_FLOW_JSON_VERSION, response: completionResponse() };
    const crypto = await import('node:crypto');
    const canonical = (value: any): any => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => [k, canonical(v)])) : value;
    // The service hashes the actual token fingerprint, so capture once to obtain the fingerprint from its conflict-safe write path.
    let writtenFingerprint = '';
    const offered = session();
    const tx1 = {
      $executeRaw: jest.fn(async (sql: any) => { const values = sql.values ?? []; const candidate = values.find((v: unknown) => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v as string)); if (candidate) writtenFingerprint = candidate as string; return 1; }),
      $queryRaw: jest.fn(async () => [offered]),
    };
    const prisma1 = { $transaction: jest.fn(async (callback: any) => callback(tx1)) };
    const service1 = new WhatsAppQuoteFlowSessionService(prisma1 as any, {} as any);
    await service1.captureCompletion({ id: '33333333-3333-4333-8333-333333333333', conversationId: offered.conversation_id, providerEventKey: 'msg_evt_1' }, { flowToken: 'token', response: completionResponse() });
    expect(writtenFingerprint).toMatch(/^[0-9a-f]{64}$/);

    const tokenHash = crypto.createHash('sha256').update('token').digest('hex');
    const evidence = { ...baseEvidence, flowTokenFingerprint: tokenHash };
    const fingerprint = crypto.createHash('sha256').update(JSON.stringify(canonical(evidence))).digest('hex');
    const completed = session({ status: 'COMPLETED', completed_at: new Date(), completion_fingerprint: fingerprint });
    const tx2 = { $executeRaw: jest.fn(async () => 1), $queryRaw: jest.fn(async () => [completed]) };
    const service2 = new WhatsAppQuoteFlowSessionService({ $transaction: jest.fn(async (callback: any) => callback(tx2)) } as any, {} as any);
    await expect(service2.captureCompletion({ id: '33333333-3333-4333-8333-333333333333', conversationId: completed.conversation_id, providerEventKey: 'msg_evt_1' }, { flowToken: 'token', response: completionResponse() })).resolves.toEqual({ sessionId: completed.id, replay: true, completed: true });
    await expect(service2.captureCompletion({ id: '33333333-3333-4333-8333-333333333333', conversationId: completed.conversation_id, providerEventKey: 'msg_evt_1' }, { flowToken: 'token', response: { ...completionResponse(), property_type: 'APARTMENT' } })).rejects.toBeInstanceOf(ConflictException);
  });

  it('makes guided fallback a deliberate durable transition', async () => {
    const prisma = { $executeRaw: jest.fn(async () => 1) };
    const service = new WhatsAppQuoteFlowSessionService(prisma as any, {} as any);
    await expect(service.enterGuidedFallback('22222222-2222-4222-8222-222222222222', 'customer requested guided fallback')).resolves.toEqual({ transitioned: true });
  });
});
