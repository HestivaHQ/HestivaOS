import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';

describe('CustomersService controlled inputs', () => {
  const customer: any = { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), delete: jest.fn() };
  const service = new CustomersService({ customer } as never);
  beforeEach(() => { jest.clearAllMocks(); });
  it('rejects an invalid status at runtime', async () => {
    await expect(service.create({ ownerId: 'owner', name: 'Acme', status: 'PENDING' as never })).rejects.toBeInstanceOf(BadRequestException);
  });
  it('keeps personal fields as trimmed free text', async () => {
    customer.create.mockResolvedValue({ id: 'customer' });
    await service.create({ ownerId: 'owner', name: ' Acme ', contactName: ' Ada ', phone: ' 123 ', notes: ' Call first ' });
    expect(customer.create.mock.calls[0][0].data).toMatchObject({ name: 'Acme', contactName: 'Ada', phone: '123', notes: 'Call first' });
  });
  it('returns only lean identifying fields for selectors', async () => {
    customer.findMany.mockResolvedValue([]);
    await service.selectorOptions();
    expect(customer.findMany.mock.calls[0][0].select).toEqual({ id: true, name: true, contactName: true });
  });
  it('deletes a customer without linked operational records', async () => {
    customer.findUnique.mockResolvedValue({ id: 'customer', _count: { properties: 0, workOrders: 0 } });
    customer.delete.mockResolvedValue({ id: 'customer' });
    await expect(service.remove('customer')).resolves.toEqual({ id: 'customer' });
    expect(customer.delete).toHaveBeenCalledWith({ where: { id: 'customer' } });
  });
  it('refuses linked properties without invoking the cascading database delete', async () => {
    customer.findUnique.mockResolvedValue({ id: 'customer', _count: { properties: 1, workOrders: 0 } });
    await expect(service.remove('customer')).rejects.toBeInstanceOf(ConflictException);
    expect(customer.delete).not.toHaveBeenCalled();
  });
  it('protects operational history with a controlled conflict', async () => {
    customer.findUnique.mockResolvedValue({ id: 'customer', _count: { properties: 1, workOrders: 2 } });
    await expect(service.remove('customer')).rejects.toThrow('operational history');
    expect(customer.delete).not.toHaveBeenCalled();
  });
  it('returns not found for an unknown customer', async () => {
    customer.findUnique.mockResolvedValue(null);
    await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
