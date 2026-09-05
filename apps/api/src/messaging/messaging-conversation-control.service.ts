import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  MessagingConversationControlAction,
  MessagingConversationControlState,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ConversationControlInput = { requestId: string; expectedVersion: number };

@Injectable()
export class MessagingConversationControlService {
  constructor(private readonly prisma: PrismaService) {}

  async automationEnabled(conversationId: string) {
    const conversation = await this.prisma.messagingConversation.findUnique({
      where: { id: conversationId },
      select: { controlState: true },
    });
    return conversation?.controlState === MessagingConversationControlState.AUTOMATION;
  }

  takeOver(conversationId: string, actorId: string, input: ConversationControlInput) {
    return this.transition(conversationId, actorId, input, MessagingConversationControlAction.TAKE_OVER,
      MessagingConversationControlState.AUTOMATION, MessagingConversationControlState.HUMAN_TAKEOVER);
  }

  returnToAutomation(conversationId: string, actorId: string, input: ConversationControlInput) {
    return this.transition(conversationId, actorId, input, MessagingConversationControlAction.RETURN_TO_AUTOMATION,
      MessagingConversationControlState.HUMAN_TAKEOVER, MessagingConversationControlState.AUTOMATION);
  }

  private async transition(
    conversationId: string,
    actorId: string,
    input: ConversationControlInput,
    action: MessagingConversationControlAction,
    previousState: MessagingConversationControlState,
    resultingState: MessagingConversationControlState,
  ) {
    if (!UUID.test(input.requestId)) throw new BadRequestException('requestId must be a UUID.');
    if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 0) {
      throw new BadRequestException('expectedVersion must be a non-negative integer.');
    }

    return this.prisma.$transaction(async (tx) => {
      const replay = await tx.messagingConversationControlEvent.findUnique({ where: { requestId: input.requestId } });
      if (replay) {
        if (replay.conversationId !== conversationId || replay.action !== action) {
          throw new ConflictException('Request identity is already bound to a different conversation-control transition.');
        }
        return { conversationId, controlState: replay.resultingState, controlVersion: replay.resultingVersion, changed: false };
      }

      await tx.$queryRaw`SELECT id FROM messaging_conversations WHERE id = ${conversationId}::uuid FOR UPDATE`;
      const conversation = await tx.messagingConversation.findUnique({
        where: { id: conversationId },
        select: { id: true, controlState: true, controlVersion: true },
      });
      if (!conversation) throw new NotFoundException('Messaging conversation not found.');
      if (conversation.controlState !== previousState || conversation.controlVersion !== input.expectedVersion) {
        throw new ConflictException('Conversation control changed; refresh before trying again.');
      }

      const updated = await tx.messagingConversation.update({
        where: { id: conversationId },
        data: { controlState: resultingState, controlVersion: { increment: 1 } },
        select: { id: true, controlState: true, controlVersion: true },
      });
      await tx.messagingConversationControlEvent.create({
        data: { conversationId, action, previousState, resultingState, resultingVersion: updated.controlVersion, actorId, requestId: input.requestId },
      });
      return { conversationId: updated.id, controlState: updated.controlState, controlVersion: updated.controlVersion, changed: true };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
