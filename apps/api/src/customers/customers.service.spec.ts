import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';

const customer: any = {
  create: jest.fn(),
  update: jest.fn(),
  findMany: jest.fn(),
  findUnique: jest.fn(),
  count: jest.fn(),
  delete: jest.fn(),
};
const customerContact: any = {
  create: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  findMany: jest.fn(),
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  count: jest.fn(),
};
const customerMessagingIdentity: any = {
  count: jest.fn(),
};
const prisma: any = {
  customer,
  customerContact,
  customerMessagingIdentity,
  $transaction: jest.fn(),
};

const service = new CustomersService(prisma as never);

describe('CustomersService account and contact management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    customerMessagingIdentity.count.mockResolvedValue(0);
    prisma.$transaction.mockImplementation(async (arg: any) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      return arg(prisma);
    });
  });

  it('keeps legacy individual creation compatible and creates the canonical primary contact', async () => {
    customer.create.mockResolvedValue({ id: 'customer-1', name: 'Ada', contactName: 'Ada' });
    customerContact.create.mockResolvedValue({ id: 'contact-1' });

    await service.create({ ownerId: 'owner', contactName: ' Ada ', phone: ' 123 ', notes: ' Call first ' });

    expect(customer.create.mock.calls[0][0].data).toMatchObject({
      name: 'Ada',
      accountType: 'INDIVIDUAL',
      contactName: 'Ada',
      phone: '123',
      notes: 'Call first',
    });
    expect(customerContact.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        customerId: 'customer-1',
        name: 'Ada',
        relationship: 'SELF',
        phone: '123',
        isPrimary: true,
      }),
    });
  });

  it('supports an organisation account name separately from its initial human contact', async () => {
    customer.create.mockResolvedValue({ id: 'customer-1', name: 'Acme Properties' });
    customerContact.create.mockResolvedValue({ id: 'contact-1' });

    await service.create({
      ownerId: 'owner',
      accountType: 'ORGANISATION' as any,
      name: ' Acme Properties ',
      contactName: ' Jane Manager ',
      email: ' JANE@EXAMPLE.COM ',
    });

    expect(customer.create.mock.calls[0][0].data).toMatchObject({
      name: 'Acme Properties',
      accountType: 'ORGANISATION',
      contactName: 'Jane Manager',
      email: 'jane@example.com',
    });
    expect(customerContact.create.mock.calls[0][0].data).toMatchObject({
      name: 'Jane Manager',
      relationship: 'PRIMARY_CONTACT',
      email: 'jane@example.com',
      isPrimary: true,
    });
  });

  it('allows an organisation without inventing a human contact', async () => {
    customer.create.mockResolvedValue({ id: 'customer-1', name: 'Acme Properties' });

    await service.create({
      ownerId: 'owner',
      accountType: 'ORGANISATION' as any,
      name: 'Acme Properties',
    });

    expect(customerContact.create).not.toHaveBeenCalled();
  });

  it('requires a person name for individuals and an account name for organisations', async () => {
    await expect(service.create({ ownerId: 'owner' } as any)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create({
      ownerId: 'owner',
      accountType: 'ORGANISATION' as any,
      contactName: 'Jane',
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid customer status and account type values at runtime', async () => {
    await expect(service.create({ ownerId: 'owner', contactName: 'Ada', status: 'PENDING' as any }))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create({ ownerId: 'owner', contactName: 'Ada', accountType: 'HOUSEHOLD' as any }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('keeps an individual compatibility edit synchronized with the canonical primary contact', async () => {
    customer.findUnique.mockResolvedValue({
      id: 'customer-1',
      accountType: 'INDIVIDUAL',
      name: 'Ada',
      contactName: 'Ada',
      email: 'old@example.com',
      phone: '111',
    });
    customer.update.mockResolvedValue({ id: 'customer-1', name: 'Grace', contactName: 'Grace' });
    customerContact.findFirst.mockResolvedValue({ id: 'contact-1' });
    customerContact.update.mockResolvedValue({ id: 'contact-1' });

    await service.update('customer-1', {
      contactName: ' Grace ',
      email: ' GRACE@EXAMPLE.COM ',
      phone: ' 222 ',
    });

    expect(customer.update.mock.calls[0][0].data).toMatchObject({
      name: 'Grace',
      contactName: 'Grace',
      email: 'grace@example.com',
      phone: '222',
    });
    expect(customerContact.update).toHaveBeenCalledWith({
      where: { id: 'contact-1' },
      data: {
        name: 'Grace',
        email: 'grace@example.com',
        phone: '222',
      },
    });
  });

  it('does not overwrite an organisation account name when its compatibility contact changes', async () => {
    customer.findUnique.mockResolvedValue({
      id: 'customer-1',
      accountType: 'ORGANISATION',
      name: 'Acme Properties',
      contactName: 'Jane',
      email: null,
      phone: null,
    });
    customer.update.mockResolvedValue({ id: 'customer-1', name: 'Acme Properties', contactName: 'John' });
    customerContact.findFirst.mockResolvedValue({ id: 'contact-1' });
    customerContact.update.mockResolvedValue({ id: 'contact-1' });

    await service.update('customer-1', { contactName: ' John ' });

    expect(customer.update.mock.calls[0][0].data).toMatchObject({ contactName: 'John' });
    expect(customer.update.mock.calls[0][0].data).not.toHaveProperty('name');
  });

  it('recreates a missing canonical primary contact when legacy fields are edited', async () => {
    customer.findUnique.mockResolvedValue({
      id: 'customer-1',
      accountType: 'INDIVIDUAL',
      name: 'Ada',
      contactName: 'Ada',
      email: 'old@example.com',
      phone: '111',
    });
    customer.update.mockResolvedValue({ id: 'customer-1' });
    customerContact.findFirst.mockResolvedValue(null);
    customerContact.create.mockResolvedValue({ id: 'contact-1' });

    await service.update('customer-1', { phone: ' 222 ' });

    expect(customerContact.create.mock.calls[0][0].data).toMatchObject({
      customerId: 'customer-1',
      name: 'Ada',
      relationship: 'SELF',
      email: 'old@example.com',
      phone: '222',
      isPrimary: true,
    });
  });

  it('searches canonical active contacts as well as compatibility fields', async () => {
    customer.findMany.mockResolvedValue([]);
    customer.count.mockResolvedValue(0);

    await service.findAll(1, 20, 'Ada');

    const where = customer.findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual(expect.arrayContaining([
      { contactName: { contains: 'Ada', mode: 'insensitive' } },
      { name: { contains: 'Ada', mode: 'insensitive' } },
      expect.objectContaining({ contacts: expect.any(Object) }),
    ]));
  });

  it('supports exact canonical id lookup through bounded search', async () => {
    customer.findMany.mockResolvedValue([]);
    customer.count.mockResolvedValue(0);
    const id = '123e4567-e89b-42d3-a456-426614174000';

    await service.findAll(1, 20, id);

    expect(customer.findMany.mock.calls[0][0].where.OR).toEqual(expect.arrayContaining([{ id }]));
  });

  it('returns account type in lean selector results and lets contact names participate in search', async () => {
    customer.findMany.mockResolvedValue([]);
    await service.selectorOptions('Jane');

    expect(customer.findMany.mock.calls[0][0].select).toEqual({
      id: true,
      name: true,
      accountType: true,
      contactName: true,
    });
    expect(customer.findMany.mock.calls[0][0].where.OR).toEqual(expect.arrayContaining([
      expect.objectContaining({ contacts: expect.any(Object) }),
    ]));
  });

  it('returns contacts and safe messaging identity metadata on Customer detail', async () => {
    customer.findUnique.mockResolvedValue({ id: 'customer-1' });

    await service.findOne('customer-1');

    const identitySelect = customer.findUnique.mock.calls[0][0].include.contacts.include.messagingIdentities.select;
    expect(identitySelect).toMatchObject({
      id: true,
      channel: true,
      provider: true,
      trustState: true,
      trustedAt: true,
      retiredAt: true,
    });
    expect(identitySelect).not.toHaveProperty('providerIdentityId');
  });

  it('creates the first active contact as primary even when the caller does not request it', async () => {
    customer.findUnique.mockResolvedValue({ id: 'customer-1' });
    customerContact.count.mockResolvedValue(0);
    customerContact.updateMany.mockResolvedValue({ count: 0 });
    customerContact.create.mockResolvedValue({ id: 'contact-1', isPrimary: true });

    await service.createContact('customer-1', { name: ' Jane ', email: ' JANE@EXAMPLE.COM ' });

    expect(customerContact.create.mock.calls[0][0].data).toMatchObject({
      customerId: 'customer-1',
      name: 'Jane',
      email: 'jane@example.com',
      isPrimary: true,
      status: 'ACTIVE',
    });
  });

  it('moves primary status deliberately when another active contact is selected', async () => {
    customerContact.findFirst.mockResolvedValue({
      id: 'contact-2',
      customerId: 'customer-1',
      name: 'Jane',
      isPrimary: false,
      status: 'ACTIVE',
    });
    customerContact.updateMany.mockResolvedValue({ count: 1 });
    customerContact.update.mockResolvedValue({ id: 'contact-2', isPrimary: true });

    await service.updateContact('customer-1', 'contact-2', { isPrimary: true });

    expect(customerContact.updateMany).toHaveBeenCalledWith({
      where: { customerId: 'customer-1', isPrimary: true, id: { not: 'contact-2' } },
      data: { isPrimary: false },
    });
    expect(customerContact.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'contact-2' },
      data: expect.objectContaining({ isPrimary: true }),
    }));
  });

  it('does not allow the current primary contact to be cleared without selecting a replacement', async () => {
    customerContact.findFirst.mockResolvedValue({
      id: 'contact-1',
      customerId: 'customer-1',
      name: 'Ada',
      isPrimary: true,
      status: 'ACTIVE',
    });

    await expect(service.updateContact('customer-1', 'contact-1', { isPrimary: false }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('retires a primary contact and promotes the oldest remaining active contact', async () => {
    customerContact.findFirst
      .mockResolvedValueOnce({
        id: 'contact-1',
        customerId: 'customer-1',
        name: 'Ada',
        isPrimary: true,
        status: 'ACTIVE',
      })
      .mockResolvedValueOnce({ id: 'contact-2' });
    customerContact.update
      .mockResolvedValueOnce({ id: 'contact-1', isPrimary: false, status: 'RETIRED' })
      .mockResolvedValueOnce({ id: 'contact-2', isPrimary: true });

    await service.updateContact('customer-1', 'contact-1', { status: 'RETIRED' as any });

    expect(customerContact.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'contact-2' },
      data: { isPrimary: true },
    });
  });

  it('fails closed when a contact does not belong to the selected Customer', async () => {
    customerContact.findFirst.mockResolvedValue(null);
    await expect(service.updateContact('customer-1', 'contact-2', { name: 'Jane' }))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not hard-delete Customers with operational or Quote history', async () => {
    customer.findUnique.mockResolvedValue({
      id: 'customer-1',
      _count: { properties: 0, workOrders: 0, quotes: 1, messagingConversations: 0 },
    });

    await expect(service.remove('customer-1')).rejects.toBeInstanceOf(ConflictException);
    expect(customer.delete).not.toHaveBeenCalled();
  });

  it('does not hard-delete Customers with messaging conversation or identity history', async () => {
    customer.findUnique.mockResolvedValue({
      id: 'customer-1',
      _count: { properties: 0, workOrders: 0, quotes: 0, messagingConversations: 0 },
    });
    customerMessagingIdentity.count.mockResolvedValue(1);

    await expect(service.remove('customer-1')).rejects.toBeInstanceOf(ConflictException);
    expect(customerMessagingIdentity.count).toHaveBeenCalledWith({
      where: { contact: { customerId: 'customer-1' } },
    });
    expect(customer.delete).not.toHaveBeenCalled();
  });

  it('still allows deleting an accidental Customer that has contacts but no protected history', async () => {
    customer.findUnique.mockResolvedValue({
      id: 'customer-1',
      _count: { properties: 0, workOrders: 0, quotes: 0, messagingConversations: 0 },
    });
    customerMessagingIdentity.count.mockResolvedValue(0);
    customer.delete.mockResolvedValue({ id: 'customer-1' });

    await expect(service.remove('customer-1')).resolves.toEqual({ id: 'customer-1' });
  });

  it('returns not found for an unknown Customer', async () => {
    customer.findUnique.mockResolvedValue(null);
    await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(customerMessagingIdentity.count).not.toHaveBeenCalled();
  });
});
