import { describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { CustomersService } from './customers.service';

describe('CustomersService controlled inputs', () => {
  const customer: any = { create: jest.fn(), findMany: jest.fn() };
  const service = new CustomersService({ customer } as never);
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
});
