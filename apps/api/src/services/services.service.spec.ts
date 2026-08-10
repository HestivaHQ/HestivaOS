import { ConflictException } from '@nestjs/common';
import { ServiceStatus, ServiceType } from '@prisma/client';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ServicesService } from './services.service';

describe('ServicesService', () => {
  const prisma: any = { service: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() } };
  const service = new ServicesService(prisma as never);

  beforeEach(() => { jest.clearAllMocks(); });

  it('creates a canonical classified service without invented operational defaults', async () => {
    prisma.service.findMany.mockResolvedValue([]);
    prisma.service.create.mockResolvedValue({ id: 'created' });
    await service.create({ name: '  Test Cleaning  ', type: ServiceType.ADD_ON });
    expect(prisma.service.create.mock.calls[0][0].data).toMatchObject({ name: 'Test Cleaning', normalizedName: 'test cleaning', type: ServiceType.ADD_ON, defaultDurationMinutes: null });
  });

  it.each(['regular home cleaning', ' Regular Home Cleaning '])('rejects case/whitespace duplicate %s', async (name: string) => {
    prisma.service.findMany.mockResolvedValue([{ id: 'existing', name: 'Regular Home Cleaning', normalizedName: 'regular home cleaning' }]);
    await expect(service.create({ name })).rejects.toBeInstanceOf(ConflictException);
  });

  it('treats Eco-Friendly Cleaning as an alias rather than a second service', async () => {
    prisma.service.findMany.mockResolvedValue([{ id: 'eco', name: 'Eco-Conscious Cleaning', normalizedName: 'eco-conscious cleaning' }]);
    await expect(service.create({ name: 'Eco-Friendly Cleaning' })).rejects.toBeInstanceOf(ConflictException);
  });

  it.each([ServiceType.PRIMARY, ServiceType.ADD_ON])('includes BOTH capabilities when filtering the %s booking context', async (type) => {
    prisma.service.findMany.mockResolvedValue([]);
    prisma.service.count = jest.fn<() => Promise<number>>().mockResolvedValue(0);
    prisma.$transaction = jest.fn<() => Promise<[unknown[], number]>>().mockResolvedValue([[], 0]);
    await service.findAll(1, 20, undefined, ServiceStatus.ACTIVE, type);
    expect(prisma.$transaction.mock.calls[0][0][0]).toBeDefined();
    expect(prisma.service.findMany.mock.calls[0][0].where.type.in).toEqual([type, ServiceType.BOTH]);
  });

  it('edits, deactivates, and reactivates without replacing the service ID', async () => {
    prisma.service.findUnique.mockResolvedValue({ id: 'service-1', name: 'Deep Cleaning' });
    prisma.service.findMany.mockResolvedValue([]);
    prisma.service.update.mockResolvedValue({ id: 'service-1' });
    await service.update('service-1', { name: 'Detailed Deep Cleaning', type: ServiceType.PRIMARY });
    await service.update('service-1', { status: ServiceStatus.INACTIVE });
    await service.update('service-1', { status: ServiceStatus.ACTIVE });
    expect(prisma.service.update.mock.calls[0][0]).toMatchObject({ where: { id: 'service-1' }, data: { normalizedName: 'detailed deep cleaning' } });
    expect(prisma.service.update.mock.calls[1][0].data.status).toBe(ServiceStatus.INACTIVE);
    expect(prisma.service.update.mock.calls[2][0].data.status).toBe(ServiceStatus.ACTIVE);
  });
});
