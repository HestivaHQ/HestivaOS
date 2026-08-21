import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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
        identity.trustState === 'TRUSTED' &&
        identity.retiredAt === null &&
        identity.contact.status === 'ACTIVE',
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
