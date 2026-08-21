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

function identityRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'identity-1',
    contactId: 'contact-1',
    trustState: 'TRUSTED',
    trustedAt: new Date('2026-08-21T16:00:00Z'),
    retiredAt: null,
    ...overrides,
  };
}

function trustPrisma(overrides: Record<string, any> = {}) {
  const tx = {
    messagingConversation: {
      findUnique: jest.fn(async () => conversation()),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
    customerContact: {
      findUnique: jest.fn(async () => ({ id: 'contact-1', customerId: 'customer-1', status: 'ACTIVE' })),
    },
    customerMessagingIdentity: {
      findUnique: jest.fn(async () => null),
      create: jest.fn(async () => identityRecord()),
      update: jest.fn(async () => identityRecord()),
    },
    messagingMessage: {
      upsert: jest.fn(async () => ({ id: 'audit-message-1' })),
    },
    ...overrides,
  };
  return {
    tx,
    prisma: {
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    },
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

  it('establishes trust only from the exact persisted conversation identity and writes an admin audit message', async () => {
    const { prisma, tx } = trustPrisma();
    const service = new MessagingCustomerLinkingService(prisma as any);

    const result = await service.trustConversationIdentity('conversation-1', 'contact-1', 'admin-1');

    expect(result).toMatchObject({
      conversationId: 'conversation-1',
      customerId: 'customer-1',
      contactId: 'contact-1',
      identityId: 'identity-1',
      trustState: 'TRUSTED',
      newlyTrusted: true,
    });
    expect(tx.customerMessagingIdentity.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        contactId: 'contact-1',
        channel: 'MESSENGER',
        provider: 'meta',
        providerIdentityId: 'psid-1',
        trustState: 'TRUSTED',
      }),
    }));
    expect(tx.messagingConversation.updateMany).toHaveBeenCalledWith({
      where: { id: 'conversation-1', customerId: null },
      data: { customerId: 'customer-1' },
    });
    expect(tx.messagingMessage.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        conversationId: 'conversation-1',
        direction: 'OUTBOUND',
        kind: 'SYSTEM',
        attachmentMetadata: expect.objectContaining({
          event: 'IDENTITY_TRUST_ESTABLISHED',
          actorUserId: 'admin-1',
          customerId: 'customer-1',
          contactId: 'contact-1',
          identityId: 'identity-1',
        }),
      }),
    }));
  });

  it('upgrades an existing UNVERIFIED identity for the same active contact', async () => {
    const { prisma, tx } = trustPrisma();
    tx.customerMessagingIdentity.findUnique.mockResolvedValueOnce(identityRecord({
      trustState: 'UNVERIFIED',
      trustedAt: null,
    }) as any);
    const service = new MessagingCustomerLinkingService(prisma as any);

    const result = await service.trustConversationIdentity('conversation-1', 'contact-1', 'admin-1');

    expect(result.newlyTrusted).toBe(true);
    expect(tx.customerMessagingIdentity.create).not.toHaveBeenCalled();
    expect(tx.customerMessagingIdentity.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'identity-1' },
      data: expect.objectContaining({ trustState: 'TRUSTED' }),
    }));
    expect(tx.messagingMessage.upsert).toHaveBeenCalledTimes(1);
  });

  it('is idempotent when the exact identity is already trusted for the same contact', async () => {
    const { prisma, tx } = trustPrisma();
    tx.customerMessagingIdentity.findUnique.mockResolvedValueOnce(identityRecord() as any);
    const service = new MessagingCustomerLinkingService(prisma as any);

    const result = await service.trustConversationIdentity('conversation-1', 'contact-1', 'admin-1');

    expect(result.newlyTrusted).toBe(false);
    expect(tx.customerMessagingIdentity.create).not.toHaveBeenCalled();
    expect(tx.customerMessagingIdentity.update).not.toHaveBeenCalled();
    expect(tx.messagingMessage.upsert).not.toHaveBeenCalled();
  });

  it('refuses to move an existing provider identity to a different contact', async () => {
    const { prisma, tx } = trustPrisma();
    tx.customerMessagingIdentity.findUnique.mockResolvedValueOnce(identityRecord({ contactId: 'contact-2' }) as any);
    const service = new MessagingCustomerLinkingService(prisma as any);

    await expect(service.trustConversationIdentity('conversation-1', 'contact-1', 'admin-1'))
      .rejects.toBeInstanceOf(ConflictException);
    expect(tx.customerMessagingIdentity.update).not.toHaveBeenCalled();
    expect(tx.messagingMessage.upsert).not.toHaveBeenCalled();
  });

  it('refuses to trust a blocked or retired identity implicitly', async () => {
    const blocked = trustPrisma();
    blocked.tx.customerMessagingIdentity.findUnique.mockResolvedValueOnce(identityRecord({ trustState: 'BLOCKED' }) as any);
    const blockedService = new MessagingCustomerLinkingService(blocked.prisma as any);
    await expect(blockedService.trustConversationIdentity('conversation-1', 'contact-1', 'admin-1'))
      .rejects.toBeInstanceOf(ConflictException);

    const retired = trustPrisma();
    retired.tx.customerMessagingIdentity.findUnique.mockResolvedValueOnce(identityRecord({ retiredAt: new Date() }) as any);
    const retiredService = new MessagingCustomerLinkingService(retired.prisma as any);
    await expect(retiredService.trustConversationIdentity('conversation-1', 'contact-1', 'admin-1'))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses to establish trust through a retired Customer contact', async () => {
    const { prisma, tx } = trustPrisma({
      customerContact: {
        findUnique: jest.fn(async () => ({ id: 'contact-1', customerId: 'customer-1', status: 'RETIRED' })),
      },
    });
    const service = new MessagingCustomerLinkingService(prisma as any);

    await expect(service.trustConversationIdentity('conversation-1', 'contact-1', 'admin-1'))
      .rejects.toBeInstanceOf(ConflictException);
    expect(tx.customerMessagingIdentity.create).not.toHaveBeenCalled();
  });

  it('refuses trust when the conversation already belongs to another Customer', async () => {
    const { prisma, tx } = trustPrisma({
      messagingConversation: {
        findUnique: jest.fn(async () => conversation('customer-2')),
        updateMany: jest.fn(async () => ({ count: 0 })),
      },
    });
    const service = new MessagingCustomerLinkingService(prisma as any);

    await expect(service.trustConversationIdentity('conversation-1', 'contact-1', 'admin-1'))
      .rejects.toBeInstanceOf(ConflictException);
    expect(tx.customerMessagingIdentity.create).not.toHaveBeenCalled();
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
