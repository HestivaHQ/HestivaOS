import { ConflictException } from '@nestjs/common';
import { MessagingDirection, MessagingMessageKind } from '@prisma/client';
import { describe, expect, it, jest } from '@jest/globals';
import { WhatsAppQuoteFlowInboundService } from './whatsapp-quote-flow-inbound.service';

function message(interactivePayload?: unknown) {
  return {
    id: 'message-1', conversationId: 'conversation-1', direction: MessagingDirection.INBOUND,
    kind: interactivePayload ? MessagingMessageKind.INTERACTIVE : MessagingMessageKind.TEXT,
    providerEventKey: 'msg_evt_1', attachmentMetadata: interactivePayload ? { interactivePayload } : null,
    conversation: { channel: 'WHATSAPP', provider: 'meta' },
  };
}

describe('WhatsAppQuoteFlowInboundService', () => {
  it('captures and authoritatively processes a valid nfm_reply while keeping it out of guided collection', async () => {
    const response = { flow_token: 'opaque', homent_contract: 'HOMENT_QUOTE_REQUEST_V1', homent_mapping_version: 'HOMENT_QUOTE_REQUEST_MAPPING_V1', homent_completion_version: 'HOMENT_QUOTE_REQUEST_COMPLETION_V1', property_type: 'HOUSE' };
    const prisma = { messagingMessage: { findUnique: jest.fn(async () => message({ type: 'nfm_reply', nfm_reply: { response_json: JSON.stringify(response) } })) } };
    const sessions = { captureCompletion: jest.fn(async () => ({ sessionId:'session-1', completed: true })), hasActiveUnresolvedSession: jest.fn(async () => true) };
    const submissions = { processCompletedSession: jest.fn(async () => ({ kind:'QUOTE' })) };
    const service = new WhatsAppQuoteFlowInboundService(prisma as any, sessions as any, submissions as any);

    await expect(service.handleInbound('message-1')).resolves.toBe(true);
    expect(sessions.hasActiveUnresolvedSession).toHaveBeenCalledWith('conversation-1');
    expect(sessions.captureCompletion).toHaveBeenCalledWith(
      { id: 'message-1', conversationId: 'conversation-1', providerEventKey: 'msg_evt_1' },
      { flowToken: 'opaque', response: expect.objectContaining({ property_type: 'HOUSE' }) },
    );
    expect(submissions.processCompletedSession).toHaveBeenCalledWith('session-1');
  });

  it('rejects malformed nfm_reply response_json before any guided mutation', async () => {
    const prisma = { messagingMessage: { findUnique: jest.fn(async () => message({ type: 'nfm_reply', nfm_reply: { response_json: '{bad' } })) } };
    const sessions = { captureCompletion: jest.fn(), hasActiveUnresolvedSession: jest.fn() };
    const submissions = { processCompletedSession: jest.fn() };
    const service = new WhatsAppQuoteFlowInboundService(prisma as any, sessions as any, submissions as any);
    await expect(service.handleInbound('message-1')).rejects.toBeInstanceOf(ConflictException);
    expect(sessions.captureCompletion).not.toHaveBeenCalled();
    expect(submissions.processCompletedSession).not.toHaveBeenCalled();
  });

  it('treats ordinary WhatsApp chat as help rather than a guided answer while Flow is unresolved', async () => {
    const prisma = { messagingMessage: { findUnique: jest.fn(async () => message()) } };
    const sessions = { captureCompletion: jest.fn(), hasActiveUnresolvedSession: jest.fn(async () => true) };
    const service = new WhatsAppQuoteFlowInboundService(prisma as any, sessions as any, {} as any);
    await expect(service.handleInbound('message-1')).resolves.toBe(true);
    expect(sessions.hasActiveUnresolvedSession).toHaveBeenCalledWith('conversation-1');
  });

  it('leaves unrelated WhatsApp traffic on the existing path when no Flow is unresolved', async () => {
    const prisma = { messagingMessage: { findUnique: jest.fn(async () => message({ type: 'button', button_reply: { id: 'x' } })) } };
    const sessions = { captureCompletion: jest.fn(), hasActiveUnresolvedSession: jest.fn(async () => false) };
    const service = new WhatsAppQuoteFlowInboundService(prisma as any, sessions as any, {} as any);
    await expect(service.handleInbound('message-1')).resolves.toBe(false);
  });

  it('promotes a reconciled accepted launch and deliberately falls back on definite provider failure', async () => {
    const execute = jest.fn(async () => 1);
    const service = new WhatsAppQuoteFlowInboundService({ $executeRaw: execute } as any, {} as any, {} as any);
    await service.reconcileLaunchStatus('33333333-3333-4333-8333-333333333333', 'delivered');
    await service.reconcileLaunchStatus('33333333-3333-4333-8333-333333333333', 'failed');
    expect(execute).toHaveBeenCalledTimes(2);
  });
});
