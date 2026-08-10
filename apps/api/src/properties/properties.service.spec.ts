import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BathroomCount, BedroomCount, BusinessListType, LivingAreaCount, StoreyCount } from '@prisma/client';
import { PropertiesService } from './properties.service';

describe('PropertiesService operational profile', () => {
  const customer: any = { findUnique: jest.fn() }, property: any = { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() }, businessListOption: any = { findUnique: jest.fn() };
  const service = new PropertiesService({ customer, property, businessListOption } as never);
  const input = { customerId: 'customer-id', name: 'Home', addressLine1: '1 Main Road', city: 'Durban', accessNotes: 'Ring bell' };
  beforeEach(() => { jest.resetAllMocks(); customer.findUnique.mockResolvedValue({ id: input.customerId }); property.create.mockImplementation((args: { data: unknown }) => args.data); });

  it.each(Object.values(BedroomCount))('accepts bedroom value %s', async (bedrooms) => { expect(await service.create({ ...input, bedrooms })).toMatchObject({ bedrooms }); });
  it('rejects invalid bedrooms', async () => { await expect(service.create({ ...input, bedrooms: 'SIX' as BedroomCount })).rejects.toBeInstanceOf(BadRequestException); });
  it.each(Object.values(BathroomCount))('accepts bathroom value %s', async (bathrooms) => { expect(await service.create({ ...input, bathrooms })).toMatchObject({ bathrooms }); });
  it('rejects invalid bathrooms', async () => { await expect(service.create({ ...input, bathrooms: 'ZERO' as BathroomCount })).rejects.toBeInstanceOf(BadRequestException); });
  it.each(Object.values(LivingAreaCount))('accepts living-area value %s', async (livingAreas) => { expect(await service.create({ ...input, livingAreas })).toMatchObject({ livingAreas }); });
  it.each(Object.values(StoreyCount))('accepts storey value %s', async (storeys) => { expect(await service.create({ ...input, storeys })).toMatchObject({ storeys }); });
  it('keeps all operational fields nullable for old and incomplete properties', async () => { const result = await service.create(input); expect(result).toMatchObject({ bedrooms: null, bathrooms: null, livingAreas: null, storeys: null, hasPets: null, hasCameras: null }); });
  it('persists household facts and trims notes', async () => { const result = await service.create({ ...input, hasPets: true, petNotes: ' Two dogs ', hasCameras: true, offLimitsNotes: ' Study ', fragileItemNotes: ' Vase ', productRestrictionNotes: ' No bleach ', allergyNotes: ' Fragrance-free ' }); expect(result).toMatchObject({ hasPets: true, petNotes: 'Two dogs', hasCameras: true, offLimitsNotes: 'Study', fragileItemNotes: 'Vase', productRestrictionNotes: 'No bleach', allergyNotes: 'Fragrance-free' }); });
  it('rejects unsupported fields', async () => { await expect(service.create({ ...input, cameraPassword: 'secret' } as never)).rejects.toThrow('Unsupported property field'); });
  it('preserves Province compatibility', async () => { expect(await service.create({ ...input, province: ' KwaZulu-Natal ' })).toMatchObject({ province: 'KwaZulu-Natal' }); });
  it('preserves the managed Property Type architecture', async () => { businessListOption.findUnique.mockResolvedValue({ type: BusinessListType.PROPERTY_TYPE, isActive: true }); await service.create({ ...input, propertyTypeOptionId: 'type-id' }); expect(property.create.mock.calls[0][0].data.propertyTypeOptionId).toBe('type-id'); });
  it('rejects a wrong or inactive property-type option', async () => { businessListOption.findUnique.mockResolvedValue({ type: BusinessListType.DEPARTMENT, isActive: true }); await expect(service.create({ ...input, propertyTypeOptionId: 'type-id' })).rejects.toBeInstanceOf(BadRequestException); });
  it('keeps an existing inactive type readable when unrelated fields change', async () => { property.findUnique.mockResolvedValue({ id: 'property-id', propertyTypeOptionId: 'inactive-id' }); property.update.mockResolvedValue({ id: 'property-id' }); await service.update('property-id', { accessNotes: ' Use side gate ' }); expect(businessListOption.findUnique).not.toHaveBeenCalled(); expect(property.update.mock.calls[0][0].data).toEqual({ accessNotes: 'Use side gate' }); });
  it('returns only identifying fields from the generic selector', async () => { property.findMany.mockResolvedValue([]); await service.selectorOptions('customer-id'); const select = property.findMany.mock.calls[0][0].select; expect(select).toEqual({ id: true, customerId: true, name: true, addressLine1: true, city: true }); expect(select).not.toHaveProperty('petNotes'); expect(select).not.toHaveProperty('hasCameras'); expect(select).not.toHaveProperty('accessNotes'); });
  it('returns authorized full detail including the live operational profile', async () => { property.findUnique.mockResolvedValue({ id: 'property-id', bedrooms: BedroomCount.THREE, petNotes: 'Dog' }); await expect(service.findOne('property-id')).resolves.toMatchObject({ bedrooms: BedroomCount.THREE, petNotes: 'Dog' }); });
  it('requires a canonical customer that exists', async () => { customer.findUnique.mockResolvedValue(null); await expect(service.create(input)).rejects.toBeInstanceOf(NotFoundException); });
});
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
