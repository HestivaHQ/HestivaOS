import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';

describe('CustomersService customer-name compatibility', () => {
  const customer: any = { create: jest.fn(), update: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), count: jest.fn(), delete: jest.fn() };
  const prisma: any = { customer, $transaction: jest.fn() };
  const service = new CustomersService(prisma as never);
  beforeEach(() => { jest.clearAllMocks(); });

  it('requires contact name and derives the compatibility name', async () => {
    customer.create.mockResolvedValue({ id: 'customer', name: 'Ada', contactName: 'Ada' });
    await service.create({ ownerId: 'owner', contactName: ' Ada ', phone: ' 123 ', notes: ' Call first ' });
    expect(customer.create.mock.calls[0][0].data).toMatchObject({ name: 'Ada', contactName: 'Ada', phone: '123', notes: 'Call first' });
  });
  it('does not accept a historical name as a substitute on new records', async () => {
    await expect(service.create({ ownerId: 'owner', name: 'Legacy' } as never)).rejects.toBeInstanceOf(BadRequestException);
  });
  it('mirrors an edited contact name without accepting blank labels', async () => {
    customer.findUnique.mockResolvedValue({ id: 'customer' }); customer.update.mockResolvedValue({ id: 'customer' });
    await service.update('customer', { contactName: ' Grace ' });
    expect(customer.update.mock.calls[0][0].data).toMatchObject({ name: 'Grace', contactName: 'Grace' });
    await expect(service.update('customer', { contactName: ' ' })).rejects.toBeInstanceOf(BadRequestException);
  });
  it('rejects an invalid status at runtime', async () => {
    await expect(service.create({ ownerId: 'owner', contactName: 'Acme', status: 'PENDING' as never })).rejects.toBeInstanceOf(BadRequestException);
  });
  it('keeps both contact and legacy names searchable', async () => {
    prisma.$transaction.mockResolvedValue([[], 0]);
    await service.findAll(1, 20, 'Ada');
    const where = customer.findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual(expect.arrayContaining([
      { contactName: { contains: 'Ada', mode: 'insensitive' } },
      { name: { contains: 'Ada', mode: 'insensitive' } },
    ]));
  });
  it('supports exact canonical id lookup through bounded search', async () => {
    prisma.$transaction.mockResolvedValue([[], 0]);
    const id = '123e4567-e89b-42d3-a456-426614174000';
    await service.findAll(1, 20, id);
    expect(customer.findMany.mock.calls[0][0].where.OR).toEqual(expect.arrayContaining([{ id }]));
  });
  it('returns only lean identifying fields for selectors', async () => {
    customer.findMany.mockResolvedValue([]); await service.selectorOptions();
    expect(customer.findMany.mock.calls[0][0].select).toEqual({ id: true, name: true, contactName: true });
  });
  it('deletes a customer without linked operational records', async () => {
    customer.findUnique.mockResolvedValue({ id: 'customer', _count: { properties: 0, workOrders: 0 } }); customer.delete.mockResolvedValue({ id: 'customer' });
    await expect(service.remove('customer')).resolves.toEqual({ id: 'customer' });
  });
  it('refuses linked properties and operational history', async () => {
    customer.findUnique.mockResolvedValue({ id: 'customer', _count: { properties: 1, workOrders: 2 } });
    await expect(service.remove('customer')).rejects.toBeInstanceOf(ConflictException); expect(customer.delete).not.toHaveBeenCalled();
  });
  it('returns not found for an unknown customer', async () => {
    customer.findUnique.mockResolvedValue(null); await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
