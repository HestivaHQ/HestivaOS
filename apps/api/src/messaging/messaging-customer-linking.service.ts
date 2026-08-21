import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CustomerContactStatus,
  MessagingDirection,
  MessagingIdentityTrustState,
  MessagingMessageKind,
  MessagingMessagePurpose,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { resolveCustomerMessagingIdentity } from './customer-identity-resolution';

@Injectable()
export class MessagingCustomerLinkingService {
  constructor(private readonly prisma: PrismaService) {}

  async get(conversationId: string) {
    const conversation = await this.prisma.messagingConversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        channel: true,
        provider: true,
        providerIdentityId: true,
        customerId: true,
      },
    });

    if (!conversation) throw new NotFoundException('Messaging conversation not found.');
    return conversation;
  }

  /**
   * Automatically link only an exact, active, explicitly TRUSTED provider
   * identity. Similar phone numbers, names, emails, addresses, unverified
   * identities and retired identities never become automatic authority here.
   */
  async resolveAndLinkTrustedIdentity(conversationId: string) {
    const conversation = await this.get(conversationId);
    const identity = await this.prisma.customerMessagingIdentity.findUnique({
      where: {
        channel_provider_providerIdentityId: {
          channel: conversation.channel,
          provider: conversation.provider,
          providerIdentityId: conversation.providerIdentityId,
        },
      },
      select: {
        id: true,
        trustState: true,
        retiredAt: true,
        contact: {
          select: {
            id: true,
            customerId: true,
            status: true,
          },
        },
      },
    });

    const eligible = Boolean(
      identity &&
        identity.trustState === MessagingIdentityTrustState.TRUSTED &&
        identity.retiredAt === null &&
        identity.contact.status === CustomerContactStatus.ACTIVE,
    );

    const resolution = resolveCustomerMessagingIdentity({
      candidates: eligible && identity
        ? [{
            customerId: identity.contact.customerId,
            contactId: identity.contact.id,
            trusted: true,
            explicitLink: true,
          }]
        : [],
      requestedCustomerId: conversation.customerId,
    });

    if (resolution.kind === 'MATCHED' && conversation.customerId === null) {
      await this.link(conversationId, resolution.customerId);
    }

    return resolution;
  }

  /**
   * ADMIN-only controller entrypoint for establishing durable trust from the
   * exact provider identity already present on a persisted conversation.
   * Inbound messages can never call this method by themselves.
   */
  async trustConversationIdentity(conversationId: string, contactId: string, actorUserId: string) {
    const trustedAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      const [conversation, contact] = await Promise.all([
        tx.messagingConversation.findUnique({
          where: { id: conversationId },
          select: {
            id: true,
            channel: true,
            provider: true,
            providerIdentityId: true,
            customerId: true,
          },
        }),
        tx.customerContact.findUnique({
          where: { id: contactId },
          select: { id: true, customerId: true, status: true },
        }),
      ]);

      if (!conversation) throw new NotFoundException('Messaging conversation not found.');
      if (!contact) throw new NotFoundException('Customer contact not found.');
      if (contact.status !== CustomerContactStatus.ACTIVE) {
        throw new ConflictException('A retired Customer contact cannot receive a trusted messaging identity.');
      }
      if (conversation.customerId && conversation.customerId !== contact.customerId) {
        throw new ConflictException('Messaging conversation is already linked to a different Customer.');
      }

      const exactWhere = {
        channel_provider_providerIdentityId: {
          channel: conversation.channel,
          provider: conversation.provider,
          providerIdentityId: conversation.providerIdentityId,
        },
      } as const;

      const existing = await tx.customerMessagingIdentity.findUnique({
        where: exactWhere,
        select: {
          id: true,
          contactId: true,
          trustState: true,
          trustedAt: true,
          retiredAt: true,
        },
      });

      if (existing?.contactId && existing.contactId !== contact.id) {
        throw new ConflictException('This provider identity is already linked to a different Customer contact.');
      }
      if (existing?.retiredAt) {
        throw new ConflictException('A retired messaging identity cannot be trusted again implicitly.');
      }
      if (existing?.trustState === MessagingIdentityTrustState.BLOCKED) {
        throw new ConflictException('A blocked messaging identity cannot be trusted implicitly.');
      }

      let newlyTrusted = false;
      let identity = existing;
      if (!identity) {
        identity = await tx.customerMessagingIdentity.create({
          data: {
            contactId: contact.id,
            channel: conversation.channel,
            provider: conversation.provider,
            providerIdentityId: conversation.providerIdentityId,
            trustState: MessagingIdentityTrustState.TRUSTED,
            trustedAt,
          },
          select: {
            id: true,
            contactId: true,
            trustState: true,
            trustedAt: true,
            retiredAt: true,
          },
        });
        newlyTrusted = true;
      } else if (identity.trustState !== MessagingIdentityTrustState.TRUSTED) {
        identity = await tx.customerMessagingIdentity.update({
          where: { id: identity.id },
          data: {
            trustState: MessagingIdentityTrustState.TRUSTED,
            trustedAt,
          },
          select: {
            id: true,
            contactId: true,
            trustState: true,
            trustedAt: true,
            retiredAt: true,
          },
        });
        newlyTrusted = true;
      }

      if (conversation.customerId === null) {
        const linked = await tx.messagingConversation.updateMany({
          where: { id: conversation.id, customerId: null },
          data: { customerId: contact.customerId },
        });
        if (linked.count !== 1) {
          const raced = await tx.messagingConversation.findUnique({
            where: { id: conversation.id },
            select: { customerId: true },
          });
          if (raced?.customerId !== contact.customerId) {
            throw new ConflictException('Messaging conversation was linked to a different Customer concurrently.');
          }
        }
      }

      if (newlyTrusted) {
        const auditKey = `identity-trust:${identity.id}`;
        await tx.messagingMessage.upsert({
          where: { idempotencyKey: auditKey },
          create: {
            conversationId: conversation.id,
            direction: MessagingDirection.OUTBOUND,
            kind: MessagingMessageKind.SYSTEM,
            purpose: MessagingMessagePurpose.GENERAL,
            idempotencyKey: auditKey,
            contentText: 'Messaging identity trusted by administrator.',
            attachmentMetadata: {
              event: 'IDENTITY_TRUST_ESTABLISHED',
              actorUserId,
              customerId: contact.customerId,
              contactId: contact.id,
              identityId: identity.id,
            } as Prisma.InputJsonValue,
            occurredAt: trustedAt,
          },
          update: {},
        });
      }

      return {
        conversationId: conversation.id,
        customerId: contact.customerId,
        contactId: contact.id,
        identityId: identity.id,
        trustState: identity.trustState,
        trustedAt: identity.trustedAt,
        newlyTrusted,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async link(conversationId: string, customerId: string) {
    const [conversation, customer] = await Promise.all([
      this.prisma.messagingConversation.findUnique({
        where: { id: conversationId },
        select: { id: true, channel: true, provider: true, providerIdentityId: true, customerId: true },
      }),
      this.prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } }),
    ]);

    if (!conversation) throw new NotFoundException('Messaging conversation not found.');
    if (!customer) throw new NotFoundException('Customer not found.');

    if (conversation.customerId === customerId) return conversation;
    if (conversation.customerId) {
      throw new ConflictException('Messaging conversation is already linked to a different Customer.');
    }

    const updated = await this.prisma.messagingConversation.updateMany({
      where: { id: conversationId, customerId: null },
      data: { customerId },
    });

    if (updated.count === 1) {
      return this.prisma.messagingConversation.findUniqueOrThrow({
        where: { id: conversationId },
        select: { id: true, channel: true, provider: true, providerIdentityId: true, customerId: true },
      });
    }

    const raced = await this.prisma.messagingConversation.findUnique({
      where: { id: conversationId },
      select: { id: true, channel: true, provider: true, providerIdentityId: true, customerId: true },
    });

    if (raced?.customerId === customerId) return raced;
    throw new ConflictException('Messaging conversation was linked to a different Customer concurrently.');
  }
}
