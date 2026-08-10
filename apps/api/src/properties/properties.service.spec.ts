import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BusinessListType } from '@prisma/client';
import { PropertiesService } from './properties.service';

describe('PropertiesService controlled relationships', () => {
  const customer: any = { findUnique: jest.fn() };
  const property: any = { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() };
  const businessListOption: any = { findUnique: jest.fn() };
  const service = new PropertiesService({ customer, property, businessListOption } as never);
  const input = { customerId: 'customer-id', name: 'Home', addressLine1: '1 Main Road', city: 'Durban', accessNotes: 'Ring bell' };
  beforeEach(() => { jest.resetAllMocks(); });

  it('requires a canonical customer that exists', async () => {
    customer.findUnique.mockResolvedValue(null);
    await expect(service.create(input)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('accepts an active property type and preserves free-text address fields', async () => {
    customer.findUnique.mockResolvedValue({ id: input.customerId });
    businessListOption.findUnique.mockResolvedValue({ type: BusinessListType.PROPERTY_TYPE, isActive: true });
    property.create.mockResolvedValue({ id: 'property-id' });
    await service.create({ ...input, propertyTypeOptionId: 'type-id' });
    expect(property.create.mock.calls[0][0].data).toMatchObject({ addressLine1: '1 Main Road', accessNotes: 'Ring bell', propertyTypeOptionId: 'type-id' });
  });

  it('rejects a wrong or inactive business-list option', async () => {
    customer.findUnique.mockResolvedValue({ id: input.customerId });
    businessListOption.findUnique.mockResolvedValue({ type: BusinessListType.DEPARTMENT, isActive: true });
    await expect(service.create({ ...input, propertyTypeOptionId: 'type-id' })).rejects.toBeInstanceOf(BadRequestException);
    businessListOption.findUnique.mockResolvedValue({ type: BusinessListType.PROPERTY_TYPE, isActive: false });
    await expect(service.create({ ...input, propertyTypeOptionId: 'type-id' })).rejects.toThrow('inactive');
  });

  it('keeps an existing inactive type readable when unrelated fields change', async () => {
    property.findUnique.mockResolvedValue({ id: 'property-id', propertyTypeOptionId: 'inactive-id' });
    property.update.mockResolvedValue({ id: 'property-id' });
    await service.update('property-id', { accessNotes: 'Use side gate' });
    expect(businessListOption.findUnique).not.toHaveBeenCalled();
    expect(property.update.mock.calls[0][0].data).toEqual({ accessNotes: 'Use side gate' });
  });
});
