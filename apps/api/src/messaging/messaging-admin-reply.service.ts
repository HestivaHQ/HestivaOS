import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MessagingChannel, MessagingDeliveryStatus, MessagingDirection, MessagingMessageKind, MessagingMessagePurpose } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { MessagingOutcomePendingReconciliationError, MessagingService } from './messaging.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MESSENGER_STANDARD_WINDOW_MS = 24 * 60 * 60 * 1000;

export type ManualMessengerReplyInput = { requestId: string; text: string };

@Injectable()
export class MessagingAdminReplyService {
  constructor(private readonly prisma: PrismaService, private readonly messaging: MessagingService) {}

  async listMessengerConversations() {
    const rows = await this.prisma.messagingConversation.findMany({
      where: { channel: MessagingChannel.MESSENGER },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        channel: true,
        provider: true,
        customerId: true,
        customer: { select: { id: true, name: true, contactName: true } },
        messages: {
          where: { direction: MessagingDirection.INBOUND },
          orderBy: { occurredAt: 'desc' },
          take: 1,
          select: { id: true, direction: true, kind: true, contentText: true, occurredAt: true },
        },
      },
    });
    const cutoff = Date.now() - MESSENGER_STANDARD_WINDOW_MS;
    return rows.map((row) => {
      const latestInbound = row.messages[0] ?? null;
      return {
        id: row.id,
        channel: row.channel,
        provider: row.provider,
        customer: row.customer,
        customerId: row.customerId,
        replyEligible: !!latestInbound && latestInbound.occurredAt.getTime() >= cutoff,
        latestInboundAt: latestInbound?.occurredAt ?? null,
        latestMessage: latestInbound,
      };
    });
  }

  async reply(conversationId: string, input: ManualMessengerReplyInput) {
    if (!UUID.test(input.requestId)) throw new BadRequestException('requestId must be a UUID.');
    const text = input.text?.trim();
    if (!text) throw new BadRequestException('Reply text is required.');

    const conversation = await this.prisma.messagingConversation.findUnique({
      where: { id: conversationId },
      select: { id: true, channel: true, provider: true, providerIdentityId: true },
    });
    if (!conversation) throw new NotFoundException('Messaging conversation not found.');
    if (conversation.channel !== MessagingChannel.MESSENGER) throw new BadRequestException('Manual reply v1 supports Messenger conversations only.');

    const latestInbound = await this.prisma.messagingMessage.findFirst({
      where: { conversationId, direction: MessagingDirection.INBOUND },
      orderBy: { occurredAt: 'desc' },
      select: { id: true, occurredAt: true },
    });
    if (!latestInbound || latestInbound.occurredAt.getTime() < Date.now() - MESSENGER_STANDARD_WINDOW_MS) {
      throw new ConflictException("Messenger replies are allowed only within 24 hours of the customer's latest message.");
    }

    const idempotencyKey = `admin-messenger-reply:${input.requestId}`;
    let message = await this.prisma.messagingMessage.findUnique({ where: { idempotencyKey } });
    if (message) {
      if (message.conversationId !== conversationId || message.direction !== MessagingDirection.OUTBOUND || message.kind !== MessagingMessageKind.TEXT || message.contentText !== text) {
        throw new ConflictException('Request identity is already bound to a different manual reply.');
      }
    } else {
      message = await this.prisma.$transaction(async (tx) => {
        const created = await tx.messagingMessage.create({
          data: {
            conversationId,
            direction: MessagingDirection.OUTBOUND,
            kind: MessagingMessageKind.TEXT,
            purpose: MessagingMessagePurpose.GENERAL,
            idempotencyKey,
            contentText: text,
            occurredAt: new Date(),
          },
        });
        await tx.messagingMessageStatusEvent.create({ data: { messageId: created.id, status: MessagingDeliveryStatus.PENDING } });
        return created;
      });
    }

    try {
      const result = await this.messaging.send({
        channel: conversation.channel,
        provider: conversation.provider,
        providerIdentityId: conversation.providerIdentityId,
        conversationId,
        causationMessageId: latestInbound.id,
        idempotencyKey,
        kind: 'TEXT',
        text,
      });
      return { messageId: message.id, providerMessageId: result.providerMessageId, acceptedAt: result.acceptedAt };
    } catch (error) {
      if (error instanceof MessagingOutcomePendingReconciliationError) {
        throw new ConflictException('The Messenger reply outcome is still being reconciled. Do not retry with a new request identity.');
      }
      throw error;
    }
  }
}
