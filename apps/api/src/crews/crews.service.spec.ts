import { describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { CrewStatus, UserRole } from '@prisma/client';
import { ROLES_KEY } from '../users/roles.decorator';
import { CrewsController } from './crews.controller';
import { CrewsService } from './crews.service';

type TechnicianFixture = { id: string; status: string; crewMembership: null };

function harness(technicians: TechnicianFixture[] = [{ id: 'tech-1', status: 'ACTIVE', crewMembership: null }, { id: 'tech-2', status: 'ACTIVE', crewMembership: null }]) {
  const existingCrew = {
    id: 'crew-1',
    name: 'Team',
    description: null,
    status: CrewStatus.ACTIVE,
    leaderId: 'tech-1',
    leader: null,
    members: technicians.map((technician) => ({ technicianId: technician.id, technician })),
    _count: { workOrders: 0 },
  };
  const crewUpdate = jest.fn(({ data }: any) => ({ ...existingCrew, ...data }));
  const tx: any = {
    crew: { update: crewUpdate },
    crewMember: { deleteMany: jest.fn(), createMany: jest.fn() },
  };
  const prisma: any = {
    crew: {
      findFirst: jest.fn(),
      findUnique: jest.fn(async () => existingCrew),
      create: jest.fn(({ data }: any) => ({ id: 'crew-1', ...data })),
    },
    technician: { findMany: jest.fn().mockImplementation(() => Promise.resolve(technicians)) },
    $transaction: jest.fn().mockImplementation((operation: any) => typeof operation === 'function' ? operation(tx) : Promise.all(operation)),
  };
  return { service: new CrewsService(prisma), prisma, tx };
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

  it('persists an explicit Crew Leader change while retaining the same members', async () => {
    const { service, tx } = harness();

    const updated = await service.update('crew-1', {
      name: 'Team',
      description: '',
      status: CrewStatus.ACTIVE,
      memberIds: ['tech-1', 'tech-2'],
      leaderId: 'tech-2',
    });

    expect(tx.crew.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'crew-1' },
      data: expect.objectContaining({ leaderId: 'tech-2' }),
    }));
    expect(updated).toEqual(expect.objectContaining({ leaderId: 'tech-2' }));
  });
});
