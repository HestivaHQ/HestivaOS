import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CustomerContactStatus,
  MessagingChannel,
  MessagingDeliveryStatus,
  MessagingDirection,
  MessagingIdentityTrustState,
  MessagingMessageKind,
  MessagingMessagePurpose,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { MessagingOutcomePendingReconciliationError, MessagingService } from './messaging.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MESSENGER_STANDARD_WINDOW_MS = 24 * 60 * 60 * 1000;

export type ManualMessengerReplyInput = { requestId: string; text: string };

function reviewKey(channel: MessagingChannel, provider: string, providerIdentityId: string) {
  return `${channel}\u0000${provider}\u0000${providerIdentityId}`;
}

@Injectable()
export class MessagingAdminReplyService {
  constructor(private readonly prisma: PrismaService, private readonly messaging: MessagingService) {}

  async listConversations() {
    const rows = await this.prisma.messagingConversation.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        channel: true,
        provider: true,
        providerIdentityId: true,
        customerId: true,
        customer: { select: { id: true, name: true, accountType: true, contactName: true } },
        messages: {
          where: { direction: MessagingDirection.INBOUND },
          orderBy: { occurredAt: 'desc' },
          take: 1,
          select: { id: true, direction: true, kind: true, contentText: true, occurredAt: true },
        },
      },
    });

    const identities = rows.length === 0
      ? []
      : await this.prisma.customerMessagingIdentity.findMany({
          where: {
            OR: rows.map((row) => ({
              channel: row.channel,
              provider: row.provider,
              providerIdentityId: row.providerIdentityId,
            })),
          },
          select: {
            id: true,
            channel: true,
            provider: true,
            providerIdentityId: true,
            trustState: true,
            retiredAt: true,
            contact: {
              select: {
                id: true,
                name: true,
                status: true,
                customerId: true,
                customer: { select: { id: true, name: true, accountType: true, contactName: true } },
              },
            },
          },
        });

    const identityByProviderKey = new Map(
      identities.map((identity) => [
        reviewKey(identity.channel, identity.provider, identity.providerIdentityId),
        identity,
      ]),
    );
    const cutoff = Date.now() - MESSENGER_STANDARD_WINDOW_MS;

    return rows.map((row) => {
      const latestInbound = row.messages[0] ?? null;
      const identity = identityByProviderKey.get(reviewKey(row.channel, row.provider, row.providerIdentityId)) ?? null;
      let reviewState: 'UNLINKED' | 'UNVERIFIED' | 'TRUSTED' | 'BLOCKED' | 'RETIRED' | 'CONFLICT' = 'UNLINKED';
      if (identity) {
        if (identity.trustState === MessagingIdentityTrustState.BLOCKED) reviewState = 'BLOCKED';
        else if (identity.retiredAt || identity.contact.status === CustomerContactStatus.RETIRED) reviewState = 'RETIRED';
        else if (identity.trustState === MessagingIdentityTrustState.TRUSTED) {
          reviewState = row.customerId && row.customerId !== identity.contact.customerId ? 'CONFLICT' : 'TRUSTED';
        } else reviewState = 'UNVERIFIED';
      }

      return {
        id: row.id,
        channel: row.channel,
        provider: row.provider,
        customer: row.customer,
        customerId: row.customerId,
        identityReview: {
          state: reviewState,
          identityId: identity?.id ?? null,
          trustState: identity?.trustState ?? null,
          retiredAt: identity?.retiredAt ?? null,
          contact: identity
            ? {
                id: identity.contact.id,
                name: identity.contact.name,
                status: identity.contact.status,
                customerId: identity.contact.customerId,
                customer: identity.contact.customer,
              }
            : null,
        },
        manualReplySupported: row.channel === MessagingChannel.MESSENGER,
        replyEligible: row.channel === MessagingChannel.MESSENGER
          && !!latestInbound
          && latestInbound.occurredAt.getTime() >= cutoff,
        latestInboundAt: latestInbound?.occurredAt ?? null,
        latestMessage: latestInbound,
      };
    });
  }

  async listMessengerConversations() {
    return (await this.listConversations()).filter((row) => row.channel === MessagingChannel.MESSENGER);
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
