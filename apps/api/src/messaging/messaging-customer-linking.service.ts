import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

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
        customerId: true,
      },
    });

    if (!conversation) throw new NotFoundException('Messaging conversation not found.');
    return conversation;
  }

  async link(conversationId: string, customerId: string) {
    const [conversation, customer] = await Promise.all([
      this.prisma.messagingConversation.findUnique({
        where: { id: conversationId },
        select: { id: true, channel: true, provider: true, customerId: true },
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
        select: { id: true, channel: true, provider: true, customerId: true },
      });
    }

    const raced = await this.prisma.messagingConversation.findUnique({
      where: { id: conversationId },
      select: { id: true, channel: true, provider: true, customerId: true },
    });

    if (raced?.customerId === customerId) return raced;
    throw new ConflictException('Messaging conversation was linked to a different Customer concurrently.');
  }
}
