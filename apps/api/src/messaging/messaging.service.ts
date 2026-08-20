import { Injectable } from '@nestjs/common';
import { MessagingDeliveryStatus, MessagingDirection, MessagingMessageKind, MessagingMessagePurpose, Prisma, WorkOrderAccessRecoveryStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import type { NormalizedInboundMessagingEvent, OutboundMessagingCommand } from './messaging-contract';
import { MessagingAdapterRegistry } from './messaging-adapter-registry';
import { buildMessagingProviderEventKey } from './messaging-idempotency';

function inboundMetadata(event: NormalizedInboundMessagingEvent): Prisma.InputJsonValue | undefined {
  if (!event.interactivePayload && !event.attribution) {
    return event.media ? (event.media as Prisma.InputJsonValue) : undefined;
  }

  const envelope: Record<string, Prisma.InputJsonValue> = {};
  if (event.media) envelope.media = event.media as Prisma.InputJsonValue;
  if (event.interactivePayload) envelope.interactivePayload = event.interactivePayload as Prisma.InputJsonValue;
  if (event.attribution) envelope.attribution = event.attribution as Prisma.InputJsonValue;
  return envelope;
}

@Injectable()
export class MessagingService {
  constructor(private readonly prisma: PrismaService, private readonly adapters: MessagingAdapterRegistry) {}
  async availableCustomerConversations(customerId: string) {
    const rows = await this.prisma.messagingConversation.findMany({ where: { customerId }, orderBy: { updatedAt: 'desc' }, select: { id: true, channel: true, provider: true, providerIdentityId: true } });
    return rows.filter((row) => this.adapters.get(row.channel, row.provider)).map(({ providerIdentityId: _private, ...safe }) => safe);
  }
  async send(command: OutboundMessagingCommand) {
    const adapter = this.adapters.get(command.channel, command.provider);
    if (!adapter) throw new Error('The selected messaging channel is not currently configured.');
    return adapter.send(command);
  }
  /** Called only after a provider adapter has authenticated and normalized a webhook. */
  async persistInbound(event: NormalizedInboundMessagingEvent) {
    const providerEventKey = buildMessagingProviderEventKey(event);
    return this.prisma.$transaction(async (tx) => {
      const replay = await tx.messagingMessage.findUnique({ where: { providerEventKey } });
      if (replay) return replay;
      const conversation = await tx.messagingConversation.upsert({ where: { channel_provider_providerIdentityId: { channel: event.channel, provider: event.provider, providerIdentityId: event.identity.providerIdentityId } }, create: { channel: event.channel, provider: event.provider, providerIdentityId: event.identity.providerIdentityId, providerConversationId: event.providerConversationId }, update: { providerConversationId: event.providerConversationId ?? undefined } });
      const message = await tx.messagingMessage.create({ data: { conversationId: conversation.id, direction: MessagingDirection.INBOUND, kind: event.kind as MessagingMessageKind, purpose: MessagingMessagePurpose.GENERAL, providerEventKey, contentText: event.text, attachmentMetadata: inboundMetadata(event), occurredAt: new Date(event.occurredAt) } });
      await tx.messagingMessageStatusEvent.create({data:{messageId:message.id,status:MessagingDeliveryStatus.RECEIVED,providerMessageId:event.providerMessageId}});
      const recovery = await tx.workOrderAccessRecovery.findFirst({ where: { conversationId: conversation.id, status: WorkOrderAccessRecoveryStatus.SENT, sentAt: { lte: message.occurredAt } }, orderBy: { sentAt: 'desc' }, select: { id: true } });
      if (recovery) await tx.workOrderAccessRecovery.update({ where: { id: recovery.id }, data: { responseMessageId: message.id, status: WorkOrderAccessRecoveryStatus.RESPONSE_REQUIRES_REVIEW } });
      return message;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
