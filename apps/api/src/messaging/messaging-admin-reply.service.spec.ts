import { ConflictException } from '@nestjs/common';
import { MessagingChannel, MessagingDeliveryStatus, MessagingDirection, MessagingMessageKind, MessagingMessagePurpose } from '@prisma/client';
import { describe, expect, it, jest } from '@jest/globals';
import { MessagingAdminReplyService } from './messaging-admin-reply.service';

const conversation = { id: '11111111-1111-4111-8111-111111111111', channel: MessagingChannel.MESSENGER, provider: 'meta', providerIdentityId: 'psid-1' };
const requestId = '22222222-2222-4222-8222-222222222222';

describe('MessagingAdminReplyService', () => {
  it('creates one durable outbound message and sends it through the shared messaging service', async () => {
    const created = { id: 'message-1', conversationId: conversation.id, direction: MessagingDirection.OUTBOUND, kind: MessagingMessageKind.TEXT, purpose: MessagingMessagePurpose.GENERAL, contentText: 'Hello back', idempotencyKey: `admin-messenger-reply:${requestId}` };
    const tx = { messagingMessage: { create: jest.fn(async () => created) }, messagingMessageStatusEvent: { create: jest.fn(async () => ({ id: 'status-1' })) } };
    const prisma = {
      messagingConversation: { findUnique: jest.fn(async () => conversation) },
      messagingMessage: { findFirst: jest.fn(async () => ({ id: 'inbound-1', occurredAt: new Date() })), findUnique: jest.fn(async () => null) },
      $transaction: jest.fn(async (callback: any) => callback(tx)),
    };
    const messaging = { send: jest.fn(async () => ({ providerMessageId: 'mid.out-1', acceptedAt: new Date().toISOString() })) };
    const service = new MessagingAdminReplyService(prisma as any, messaging as any);

    const result = await service.reply(conversation.id, { requestId, text: '  Hello back  ' });

    expect(tx.messagingMessage.create).toHaveBeenCalledWith({ data: expect.objectContaining({ conversationId: conversation.id, direction: MessagingDirection.OUTBOUND, kind: MessagingMessageKind.TEXT, purpose: MessagingMessagePurpose.GENERAL, contentText: 'Hello back' }) });
    expect(tx.messagingMessageStatusEvent.create).toHaveBeenCalledWith({ data: { messageId: 'message-1', status: MessagingDeliveryStatus.PENDING } });
    expect(messaging.send).toHaveBeenCalledWith(expect.objectContaining({ channel: MessagingChannel.MESSENGER, conversationId: conversation.id, idempotencyKey: `admin-messenger-reply:${requestId}`, text: 'Hello back' }));
    expect(result.providerMessageId).toBe('mid.out-1');
  });

  it('reuses the same durable reply for the same request identity', async () => {
    const existing = { id: 'message-1', conversationId: conversation.id, direction: MessagingDirection.OUTBOUND, kind: MessagingMessageKind.TEXT, contentText: 'Hello back', idempotencyKey: `admin-messenger-reply:${requestId}` };
    const prisma = {
      messagingConversation: { findUnique: jest.fn(async () => conversation) },
      messagingMessage: { findFirst: jest.fn(async () => ({ id: 'inbound-1', occurredAt: new Date() })), findUnique: jest.fn(async () => existing) },
      $transaction: jest.fn(),
    };
    const messaging = { send: jest.fn(async () => ({ providerMessageId: 'mid.out-1', acceptedAt: new Date().toISOString() })) };
    const service = new MessagingAdminReplyService(prisma as any, messaging as any);

    await service.reply(conversation.id, { requestId, text: 'Hello back' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(messaging.send).toHaveBeenCalledTimes(1);
  });

  it('fails before durable creation when the Messenger reply window is closed', async () => {
    const prisma = {
      messagingConversation: { findUnique: jest.fn(async () => conversation) },
      messagingMessage: { findFirst: jest.fn(async () => ({ id: 'inbound-1', occurredAt: new Date(Date.now() - 25 * 60 * 60 * 1000) })), findUnique: jest.fn() },
      $transaction: jest.fn(),
    };
    const messaging = { send: jest.fn() };
    const service = new MessagingAdminReplyService(prisma as any, messaging as any);

    await expect(service.reply(conversation.id, { requestId, text: 'Too late' })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(messaging.send).not.toHaveBeenCalled();
  });

  it('marks only recent inbound Messenger conversations as reply eligible', async () => {
    const now = Date.now();
    const prisma = { messagingConversation: { findMany: jest.fn(async () => [
      { id: 'recent', channel: MessagingChannel.MESSENGER, provider: 'meta', customerId: null, customer: null, messages: [{ id: 'm1', direction: MessagingDirection.INBOUND, kind: MessagingMessageKind.TEXT, contentText: 'Hi', occurredAt: new Date(now - 60 * 60 * 1000) }] },
      { id: 'old', channel: MessagingChannel.MESSENGER, provider: 'meta', customerId: null, customer: null, messages: [{ id: 'm2', direction: MessagingDirection.INBOUND, kind: MessagingMessageKind.TEXT, contentText: 'Hi', occurredAt: new Date(now - 25 * 60 * 60 * 1000) }] },
    ]) } };
    const service = new MessagingAdminReplyService(prisma as any, {} as any);
    const rows = await service.listMessengerConversations();
    expect(rows.map((row) => [row.id, row.replyEligible])).toEqual([['recent', true], ['old', false]]);
  });
});
