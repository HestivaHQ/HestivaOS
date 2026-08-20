import { ConflictException, Injectable } from '@nestjs/common';
import { MessagingDeliveryStatus, MessagingDirection, MessagingMessageKind, MessagingMessagePurpose, Prisma, WorkOrderAccessRecoveryStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import type { NormalizedInboundMessagingEvent, OutboundMessagingCommand, OutboundMessagingResult } from './messaging-contract';
import { MessagingAdapterRegistry } from './messaging-adapter-registry';
import { buildMessagingProviderEventKey } from './messaging-idempotency';
import { MessagingProviderOutcomeUnknownError } from './messaging-provider-adapter';
import type { NormalizedWhatsAppStatusEvent } from './whatsapp-cloud-api.adapter';

const MESSENGER_STANDARD_WINDOW_MS = 24 * 60 * 60 * 1000;

export class MessagingOutcomePendingReconciliationError extends Error {
  constructor() {
    super('The provider outcome is still awaiting reconciliation. Do not resend this message yet.');
    this.name = 'MessagingOutcomePendingReconciliationError';
  }
}

function inboundMetadata(event: NormalizedInboundMessagingEvent): Prisma.InputJsonValue | undefined {
  if (!event.interactivePayload && !event.attribution) return event.media ? event.media as Prisma.InputJsonValue : undefined;
  const envelope: Record<string, Prisma.InputJsonValue> = {};
  if (event.media) envelope.media = event.media as Prisma.InputJsonValue;
  if (event.interactivePayload) envelope.interactivePayload = event.interactivePayload as Prisma.InputJsonValue;
  if (event.attribution) envelope.attribution = event.attribution as Prisma.InputJsonValue;
  return envelope;
}

function isMetaMessenger(channel: string, provider: string): boolean {
  return channel === 'MESSENGER' && provider.trim().toLowerCase() === 'meta';
}

@Injectable()
export class MessagingService {
  constructor(private readonly prisma: PrismaService, private readonly adapters: MessagingAdapterRegistry) {}

  async availableCustomerConversations(customerId: string) {
    const rows = await this.prisma.messagingConversation.findMany({
      where: { customerId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        channel: true,
        provider: true,
        providerIdentityId: true,
        messages: {
          where: { direction: MessagingDirection.INBOUND },
          orderBy: { occurredAt: 'desc' },
          take: 1,
          select: { occurredAt: true },
        },
      },
    });
    const cutoff = Date.now() - MESSENGER_STANDARD_WINDOW_MS;
    return rows
      .filter((row) => {
        if (!this.adapters.get(row.channel, row.provider)) return false;
        if (!isMetaMessenger(row.channel, row.provider)) return true;
        return !!row.messages[0] && row.messages[0].occurredAt.getTime() >= cutoff;
      })
      .map(({ providerIdentityId: _private, messages: _messages, ...safe }) => safe);
  }

  async send(command: OutboundMessagingCommand): Promise<OutboundMessagingResult> {
    const adapter = this.adapters.get(command.channel, command.provider);
    if (!adapter) throw new Error('The selected messaging channel is not currently configured.');
    const message = await this.prisma.messagingMessage.findUnique({ where: { idempotencyKey: command.idempotencyKey }, include: { statusEvents: { orderBy: { createdAt: 'asc' } } } });
    if (!message) throw new Error('Outbound messaging requires a durable local message before provider delivery.');
    if (message.conversationId !== command.conversationId) throw new ConflictException('Outbound messaging command does not match the durable conversation.');

    if (isMetaMessenger(command.channel, command.provider)) {
      const latestInbound = await this.prisma.messagingMessage.findFirst({
        where: { conversationId: command.conversationId, direction: MessagingDirection.INBOUND },
        orderBy: { occurredAt: 'desc' },
        select: { occurredAt: true },
      });
      if (!latestInbound || latestInbound.occurredAt.getTime() < Date.now() - MESSENGER_STANDARD_WINDOW_MS) {
        throw new ConflictException('Messenger replies are allowed only within 24 hours of the customer\'s latest message.');
      }
    }

    const accepted = [...message.statusEvents].reverse().find((event) => event.status === MessagingDeliveryStatus.ACCEPTED && event.providerMessageId);
    if (accepted?.providerMessageId) return { providerMessageId: accepted.providerMessageId, acceptedAt: accepted.createdAt.toISOString() };
    const pendingCount = message.statusEvents.filter((event) => event.status === MessagingDeliveryStatus.PENDING).length;
    const latest = message.statusEvents.at(-1);
    if (latest?.status === MessagingDeliveryStatus.PENDING && pendingCount >= 2) throw new MessagingOutcomePendingReconciliationError();

    try {
      const result = await adapter.send(command);
      await this.appendStatus(message.id, MessagingDeliveryStatus.ACCEPTED, result.providerMessageId);
      return result;
    } catch (error) {
      if (error instanceof MessagingProviderOutcomeUnknownError) {
        const raced = await this.prisma.messagingMessageStatusEvent.findFirst({ where: { messageId: message.id, status: MessagingDeliveryStatus.ACCEPTED, providerMessageId: { not: null } }, orderBy: { createdAt: 'desc' } });
        if (raced?.providerMessageId) return { providerMessageId: raced.providerMessageId, acceptedAt: raced.createdAt.toISOString() };
        const pendingNow = await this.prisma.messagingMessageStatusEvent.count({ where: { messageId: message.id, status: MessagingDeliveryStatus.PENDING } });
        if (pendingNow < 2) {
          await this.prisma.messagingMessageStatusEvent.create({ data: { messageId: message.id, status: MessagingDeliveryStatus.PENDING } });
        }
        throw new MessagingOutcomePendingReconciliationError();
      }
      await this.appendStatus(message.id, MessagingDeliveryStatus.FAILED);
      throw error;
    }
  }

  async persistWhatsAppStatus(event: NormalizedWhatsAppStatusEvent) {
    let message = event.correlationId ? await this.prisma.messagingMessage.findUnique({ where: { idempotencyKey: event.correlationId } }) : null;
    if (!message) {
      const prior = await this.prisma.messagingMessageStatusEvent.findFirst({ where: { providerMessageId: event.providerMessageId }, orderBy: { createdAt: 'desc' }, select: { messageId: true } });
      if (prior) message = await this.prisma.messagingMessage.findUnique({ where: { id: prior.messageId } });
    }
    if (!message || message.direction !== MessagingDirection.OUTBOUND) return null;

    const occurredAt = new Date(event.occurredAt);
    await this.prisma.messagingProviderStatusEvent.upsert({
      where: {
        provider_providerMessageId_providerStatus_occurredAt: {
          provider: 'meta',
          providerMessageId: event.providerMessageId,
          providerStatus: event.providerStatus,
          occurredAt,
        },
      },
      create: {
        messageId: message.id,
        provider: 'meta',
        providerMessageId: event.providerMessageId,
        providerStatus: event.providerStatus,
        occurredAt,
      },
      update: {},
    });

    const mapped = event.providerStatus === 'failed' ? MessagingDeliveryStatus.FAILED : MessagingDeliveryStatus.ACCEPTED;
    await this.appendStatus(message.id, mapped, event.providerMessageId);

    const recovery = await this.prisma.workOrderAccessRecovery.findUnique({ where: { outboundMessageId: message.id } });
    if (!recovery || recovery.status === WorkOrderAccessRecoveryStatus.RESPONSE_REQUIRES_REVIEW || recovery.status === WorkOrderAccessRecoveryStatus.CLOSED) return message;
    if (mapped === MessagingDeliveryStatus.ACCEPTED) {
      await this.prisma.workOrderAccessRecovery.update({ where: { id: recovery.id }, data: { status: WorkOrderAccessRecoveryStatus.SENT, sentAt: recovery.sentAt ?? occurredAt } });
    } else {
      await this.prisma.workOrderAccessRecovery.update({ where: { id: recovery.id }, data: { status: WorkOrderAccessRecoveryStatus.SEND_FAILED } });
    }
    return message;
  }

  /** Called only after a provider adapter has authenticated and normalized a webhook. */
  async persistInbound(event: NormalizedInboundMessagingEvent) {
    const providerEventKey = buildMessagingProviderEventKey(event);
    return this.prisma.$transaction(async (tx) => {
      const replay = await tx.messagingMessage.findUnique({ where: { providerEventKey } });
      if (replay) return replay;
      const conversation = await tx.messagingConversation.upsert({ where: { channel_provider_providerIdentityId: { channel: event.channel, provider: event.provider, providerIdentityId: event.identity.providerIdentityId } }, create: { channel: event.channel, provider: event.provider, providerIdentityId: event.identity.providerIdentityId, providerConversationId: event.providerConversationId }, update: { providerConversationId: event.providerConversationId ?? undefined } });
      const message = await tx.messagingMessage.create({ data: { conversationId: conversation.id, direction: MessagingDirection.INBOUND, kind: event.kind as MessagingMessageKind, purpose: MessagingMessagePurpose.GENERAL, providerEventKey, contentText: event.text, attachmentMetadata: inboundMetadata(event), occurredAt: new Date(event.occurredAt) } });
      await tx.messagingMessageStatusEvent.create({ data: { messageId: message.id, status: MessagingDeliveryStatus.RECEIVED, providerMessageId: event.providerMessageId } });
      const recovery = await tx.workOrderAccessRecovery.findFirst({ where: { conversationId: conversation.id, status: WorkOrderAccessRecoveryStatus.SENT, sentAt: { lte: message.occurredAt } }, orderBy: { sentAt: 'desc' }, select: { id: true } });
      if (recovery) await tx.workOrderAccessRecovery.update({ where: { id: recovery.id }, data: { responseMessageId: message.id, status: WorkOrderAccessRecoveryStatus.RESPONSE_REQUIRES_REVIEW } });
      return message;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private async appendStatus(messageId: string, status: MessagingDeliveryStatus, providerMessageId?: string) {
    const existing = await this.prisma.messagingMessageStatusEvent.findFirst({ where: { messageId, status, providerMessageId: providerMessageId ?? null } });
    if (existing) return existing;
    return this.prisma.messagingMessageStatusEvent.create({ data: { messageId, status, providerMessageId } });
  }
}
