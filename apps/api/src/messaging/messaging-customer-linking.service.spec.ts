import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { MessagingCustomerLinkingService } from './messaging-customer-linking.service';

function conversation(customerId: string | null = null) {
  return { id: 'conversation-1', channel: 'MESSENGER', provider: 'meta', customerId };
}

describe('MessagingCustomerLinkingService', () => {
  it('links an unlinked provider conversation to an existing Customer', async () => {
    const findConversation = jest.fn(async () => conversation());
    const findCustomer = jest.fn(async () => ({ id: 'customer-1' }));
    const updateMany = jest.fn(async () => ({ count: 1 }));
    const findUniqueOrThrow = jest.fn(async () => conversation('customer-1'));
    const prisma = {
      messagingConversation: { findUnique: findConversation, updateMany, findUniqueOrThrow },
      customer: { findUnique: findCustomer },
    };
    const service = new MessagingCustomerLinkingService(prisma as any);

    const result = await service.link('conversation-1', 'customer-1');

    expect(result.customerId).toBe('customer-1');
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'conversation-1', customerId: null },
      data: { customerId: 'customer-1' },
    });
  });

  it('is idempotent when the conversation is already linked to the same Customer', async () => {
    const updateMany = jest.fn();
    const prisma = {
      messagingConversation: { findUnique: jest.fn(async () => conversation('customer-1')), updateMany },
      customer: { findUnique: jest.fn(async () => ({ id: 'customer-1' })) },
    };
    const service = new MessagingCustomerLinkingService(prisma as any);

    const result = await service.link('conversation-1', 'customer-1');

    expect(result.customerId).toBe('customer-1');
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('refuses silent reassignment to a different Customer', async () => {
    const prisma = {
      messagingConversation: { findUnique: jest.fn(async () => conversation('customer-1')) },
      customer: { findUnique: jest.fn(async () => ({ id: 'customer-2' })) },
    };
    const service = new MessagingCustomerLinkingService(prisma as any);

    await expect(service.link('conversation-1', 'customer-2')).rejects.toBeInstanceOf(ConflictException);
  });

  it('fails closed when the conversation does not exist', async () => {
    const prisma = {
      messagingConversation: { findUnique: jest.fn(async () => null) },
      customer: { findUnique: jest.fn(async () => ({ id: 'customer-1' })) },
    };
    const service = new MessagingCustomerLinkingService(prisma as any);

    await expect(service.link('conversation-1', 'customer-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('fails closed when the Customer does not exist', async () => {
    const prisma = {
      messagingConversation: { findUnique: jest.fn(async () => conversation()) },
      customer: { findUnique: jest.fn(async () => null) },
    };
    const service = new MessagingCustomerLinkingService(prisma as any);

    await expect(service.link('conversation-1', 'customer-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('detects a concurrent link to a different Customer', async () => {
    const findUnique = jest
      .fn<() => Promise<ReturnType<typeof conversation> | null>>()
      .mockResolvedValueOnce(conversation())
      .mockResolvedValueOnce(conversation('customer-2'));
    const prisma = {
      messagingConversation: {
        findUnique,
        updateMany: jest.fn(async () => ({ count: 0 })),
      },
      customer: { findUnique: jest.fn(async () => ({ id: 'customer-1' })) },
    };
    const service = new MessagingCustomerLinkingService(prisma as any);

    await expect(service.link('conversation-1', 'customer-1')).rejects.toBeInstanceOf(ConflictException);
  });
});
