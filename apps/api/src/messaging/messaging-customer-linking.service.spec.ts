import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { MessagingCustomerLinkingService } from './messaging-customer-linking.service';

function conversation(customerId: string | null = null) {
  return {
    id: 'conversation-1',
    channel: 'MESSENGER',
    provider: 'meta',
    providerIdentityId: 'psid-1',
    customerId,
  };
}

function trustedIdentity(overrides: Record<string, unknown> = {}) {
  return {
    id: 'identity-1',
    trustState: 'TRUSTED',
    retiredAt: null,
    contact: {
      id: 'contact-1',
      customerId: 'customer-1',
      status: 'ACTIVE',
    },
    ...overrides,
  };
}

describe('MessagingCustomerLinkingService', () => {
  it('automatically links an exact active TRUSTED provider identity', async () => {
    const prisma = {
      messagingConversation: { findUnique: jest.fn(async () => conversation()) },
      customerMessagingIdentity: { findUnique: jest.fn(async () => trustedIdentity()) },
    };
    const service = new MessagingCustomerLinkingService(prisma as any);
    const link = jest.spyOn(service, 'link').mockResolvedValue(conversation('customer-1') as any);

    const result = await service.resolveAndLinkTrustedIdentity('conversation-1');

    expect(result).toEqual({ kind: 'MATCHED', customerId: 'customer-1', contactId: 'contact-1' });
    expect(link).toHaveBeenCalledWith('conversation-1', 'customer-1');
    expect(prisma.customerMessagingIdentity.findUnique).toHaveBeenCalledWith({
      where: {
        channel_provider_providerIdentityId: {
          channel: 'MESSENGER',
          provider: 'meta',
          providerIdentityId: 'psid-1',
        },
      },
      select: expect.any(Object),
    });
  });

  it('does not relink when the trusted identity matches the existing Customer', async () => {
    const prisma = {
      messagingConversation: { findUnique: jest.fn(async () => conversation('customer-1')) },
      customerMessagingIdentity: { findUnique: jest.fn(async () => trustedIdentity()) },
    };
    const service = new MessagingCustomerLinkingService(prisma as any);
    const link = jest.spyOn(service, 'link');

    const result = await service.resolveAndLinkTrustedIdentity('conversation-1');

    expect(result.kind).toBe('MATCHED');
    expect(link).not.toHaveBeenCalled();
  });

  it('returns UNLINKED for a new or unknown provider identity', async () => {
    const prisma = {
      messagingConversation: { findUnique: jest.fn(async () => conversation()) },
      customerMessagingIdentity: { findUnique: jest.fn(async () => null) },
    };
    const service = new MessagingCustomerLinkingService(prisma as any);
    const link = jest.spyOn(service, 'link');

    await expect(service.resolveAndLinkTrustedIdentity('conversation-1')).resolves.toEqual({ kind: 'UNLINKED' });
    expect(link).not.toHaveBeenCalled();
  });

  it('does not trust an UNVERIFIED identity', async () => {
    const prisma = {
      messagingConversation: { findUnique: jest.fn(async () => conversation()) },
      customerMessagingIdentity: {
        findUnique: jest.fn(async () => trustedIdentity({ trustState: 'UNVERIFIED' })),
      },
    };
    const service = new MessagingCustomerLinkingService(prisma as any);
    const link = jest.spyOn(service, 'link');

    await expect(service.resolveAndLinkTrustedIdentity('conversation-1')).resolves.toEqual({ kind: 'UNLINKED' });
    expect(link).not.toHaveBeenCalled();
  });

  it('does not trust a retired identity', async () => {
    const prisma = {
      messagingConversation: { findUnique: jest.fn(async () => conversation()) },
      customerMessagingIdentity: {
        findUnique: jest.fn(async () => trustedIdentity({ retiredAt: new Date('2026-08-21T00:00:00Z') })),
      },
    };
    const service = new MessagingCustomerLinkingService(prisma as any);
    const link = jest.spyOn(service, 'link');

    await expect(service.resolveAndLinkTrustedIdentity('conversation-1')).resolves.toEqual({ kind: 'UNLINKED' });
    expect(link).not.toHaveBeenCalled();
  });

  it('does not trust an identity whose Customer contact is retired', async () => {
    const prisma = {
      messagingConversation: { findUnique: jest.fn(async () => conversation()) },
      customerMessagingIdentity: {
        findUnique: jest.fn(async () => trustedIdentity({
          contact: { id: 'contact-1', customerId: 'customer-1', status: 'RETIRED' },
        })),
      },
    };
    const service = new MessagingCustomerLinkingService(prisma as any);
    const link = jest.spyOn(service, 'link');

    await expect(service.resolveAndLinkTrustedIdentity('conversation-1')).resolves.toEqual({ kind: 'UNLINKED' });
    expect(link).not.toHaveBeenCalled();
  });

  it('returns CONFLICT instead of silently changing an existing Customer link', async () => {
    const prisma = {
      messagingConversation: { findUnique: jest.fn(async () => conversation('customer-2')) },
      customerMessagingIdentity: { findUnique: jest.fn(async () => trustedIdentity()) },
    };
    const service = new MessagingCustomerLinkingService(prisma as any);
    const link = jest.spyOn(service, 'link');

    await expect(service.resolveAndLinkTrustedIdentity('conversation-1')).resolves.toEqual({
      kind: 'CONFLICT',
      linkedCustomerId: 'customer-1',
      requestedCustomerId: 'customer-2',
    });
    expect(link).not.toHaveBeenCalled();
  });

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
