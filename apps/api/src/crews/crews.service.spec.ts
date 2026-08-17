import { describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CrewStatus, UserRole } from '@prisma/client';
import { ROLES_KEY } from '../users/roles.decorator';
import { CrewsController } from './crews.controller';
import { CrewsService } from './crews.service';

type TechnicianFixture = { id: string; status: string; crewMembership: null };

function harness(technicians: TechnicianFixture[] = [{ id: 'tech-1', status: 'ACTIVE', crewMembership: null }, { id: 'tech-2', status: 'ACTIVE', crewMembership: null }]) {
  const prisma: any = {
    crew: { findFirst: jest.fn(), create: jest.fn(({ data }: any) => ({ id: 'crew-1', ...data })) },
    technician: { findMany: jest.fn().mockImplementation(() => Promise.resolve(technicians)) },
  };
  return { service: new CrewsService(prisma), prisma };
}

describe('Crew leadership', () => {
  it('restricts Crew mutations to ADMIN', () => {
    for (const method of ['create', 'update', 'remove'] as const) expect(Reflect.getMetadata(ROLES_KEY, CrewsController.prototype[method])).toEqual([UserRole.ADMIN]);
  });

  it('automatically makes the sole Technician Crew Leader', async () => {
    const { service, prisma } = harness([{ id: 'tech-1', status: 'ACTIVE', crewMembership: null }]);
    await service.create({ name: 'Solo', memberIds: ['tech-1'] });
    expect(prisma.crew.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ leaderId: 'tech-1' }) }));
  });

  it('requires one member and one selected leader for an active multi-person Crew', async () => {
    const { service } = harness();
    await expect(service.create({ name: 'Empty', memberIds: [] })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create({ name: 'Team', memberIds: ['tech-1', 'tech-2'] })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires the Crew Leader to be an eligible member', async () => {
    const { service } = harness();
    await expect(service.create({ name: 'Team', memberIds: ['tech-1', 'tech-2'], leaderId: 'tech-3' })).rejects.toBeInstanceOf(BadRequestException);
    const inactive = harness([{ id: 'tech-1', status: 'INACTIVE', crewMembership: null }]);
    await expect(inactive.service.create({ name: 'Inactive', memberIds: ['tech-1'] })).rejects.toBeInstanceOf(BadRequestException);
  });
});
