import { ConflictException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { MessagingConversationControlAction, MessagingConversationControlState } from '@prisma/client';
import { MessagingConversationControlService } from './messaging-conversation-control.service';

const conversationId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';
const requestId = '33333333-3333-4333-8333-333333333333';

function harness(state: MessagingConversationControlState = MessagingConversationControlState.AUTOMATION, version = 0) {
  const conversation = { id: conversationId, controlState: state, controlVersion: version };
  const tx = {
    $queryRaw: jest.fn(async () => [{ id: conversationId }]),
    messagingConversation: {
      findUnique: jest.fn(async () => ({ ...conversation })),
      update: jest.fn(async ({ data }: any) => {
        conversation.controlState = data.controlState;
        conversation.controlVersion += 1;
        return { ...conversation };
      }),
    },
    messagingConversationControlEvent: { findUnique: jest.fn(async () => null), create: jest.fn(async ({ data }: any) => data) },
  };
  const prisma = {
    messagingConversation: { findUnique: jest.fn(async () => ({ controlState: conversation.controlState })) },
    $transaction: jest.fn(async (callback: any) => callback(tx)),
  };
  return { service: new MessagingConversationControlService(prisma as any), tx, conversation };
}

describe('MessagingConversationControlService', () => {
  it('atomically takes over and appends the actor audit transition without mutating messages', async () => {
    const h = harness();
    await expect(h.service.takeOver(conversationId, actorId, { requestId, expectedVersion: 0 })).resolves.toEqual({
      conversationId, controlState: MessagingConversationControlState.HUMAN_TAKEOVER, controlVersion: 1, changed: true,
    });
    expect(h.tx.messagingConversationControlEvent.create).toHaveBeenCalledWith({ data: {
      conversationId, actorId, requestId,
      action: MessagingConversationControlAction.TAKE_OVER,
      previousState: MessagingConversationControlState.AUTOMATION,
      resultingState: MessagingConversationControlState.HUMAN_TAKEOVER,
      resultingVersion: 1,
    } });
    expect((h.tx as any).messagingMessage).toBeUndefined();
  });

  it('returns human control to automation without touching Quote state', async () => {
    const h = harness(MessagingConversationControlState.HUMAN_TAKEOVER, 4);
    await h.service.returnToAutomation(conversationId, actorId, { requestId, expectedVersion: 4 });
    expect(h.tx.messagingConversation.update).toHaveBeenCalledWith({
      where: { id: conversationId },
      data: { controlState: MessagingConversationControlState.AUTOMATION, controlVersion: { increment: 1 } },
      select: { id: true, controlState: true, controlVersion: true },
    });
  });

  it('fails a stale transition instead of overwriting newer control', async () => {
    const h = harness(MessagingConversationControlState.AUTOMATION, 2);
    await expect(h.service.takeOver(conversationId, actorId, { requestId, expectedVersion: 1 })).rejects.toBeInstanceOf(ConflictException);
    expect(h.tx.messagingConversationControlEvent.create).not.toHaveBeenCalled();
  });

  it('replays the same request id without a second transition event', async () => {
    const h = harness();
    h.tx.messagingConversationControlEvent.findUnique.mockResolvedValueOnce({
      conversationId, action: MessagingConversationControlAction.TAKE_OVER,
      resultingState: MessagingConversationControlState.HUMAN_TAKEOVER,
      resultingVersion: 1,
    } as any);
    await expect(h.service.takeOver(conversationId, actorId, { requestId, expectedVersion: 0 })).resolves.toMatchObject({ changed: false });
    expect(h.tx.messagingConversation.update).not.toHaveBeenCalled();
  });
});
