import { describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { UserRole, WorkOrderStatus } from '@prisma/client';
import { ROLES_KEY } from '../users/roles.decorator';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';

const technicians = [
  { id: 'tech-1', status: 'ACTIVE', employeeRecord: { status: 'ACTIVE' } },
  { id: 'tech-2', status: 'ACTIVE', employeeRecord: null },
];

function harness(existingIds: string[] = []) {
  const tx = {
    workOrderTechnician: { deleteMany: jest.fn(), createMany: jest.fn() },
    workOrder: { update: jest.fn().mockImplementation(({ data }: any) => ({ id: 'wo-1', ...data })) },
    workOrderActivity: { createMany: jest.fn() },
  };
  const prisma: any = {
    technician: { findMany: jest.fn().mockImplementation(({ where }: any) => Promise.resolve(technicians.filter((item) => where.id.in.includes(item.id)))) },
    crew: { findUnique: jest.fn() },
    $transaction: jest.fn().mockImplementation((callback: any) => callback(tx)),
  };
  const service = new WorkOrdersService(prisma);
  jest.spyOn(service, 'findOne').mockResolvedValue({
    id: 'wo-1', status: WorkOrderStatus.NEW, crewId: null, crew: null, jobLeaderId: existingIds[0] ?? null,
    assignedTechnicians: existingIds.map((technicianId) => ({ technicianId, technician: technicians.find((item) => item.id === technicianId) })),
  } as never);
  return { service, prisma, tx };
}

describe('Work Order technician assignments', () => {
  it('limits assignment mutation to ADMIN', () => {
    const method = WorkOrdersController.prototype.assignTechnicians;
    expect(Reflect.getMetadata(ROLES_KEY, method)).toEqual([UserRole.ADMIN]);
  });

  it('persists one or many unique technicians and assigns an unassigned Work Order', async () => {
    const { service, tx } = harness();
    await service.assignTechnicians('wo-1', ['tech-1', 'tech-1', 'tech-2'], null, undefined, 'admin-1');
    expect(tx.workOrderTechnician.createMany).toHaveBeenCalledWith({ data: [
      { workOrderId: 'wo-1', technicianId: 'tech-1' },
      { workOrderId: 'wo-1', technicianId: 'tech-2' },
    ] });
    expect(tx.workOrder.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: WorkOrderStatus.ASSIGNED }) }));
  });

  it('allows removal and replacement while retaining explicit job-specific state', async () => {
    const { service, tx } = harness(['tech-1']);
    await service.assignTechnicians('wo-1', ['tech-2'], undefined, undefined, 'admin-1');
    expect(tx.workOrderTechnician.deleteMany).toHaveBeenCalledWith({ where: { workOrderId: 'wo-1' } });
    expect(tx.workOrderTechnician.createMany).toHaveBeenCalledWith({ data: [{ workOrderId: 'wo-1', technicianId: 'tech-2' }] });
  });

  it('keeps an unassigned Work Order valid', async () => {
    const { service, tx } = harness(['tech-1']);
    await service.assignTechnicians('wo-1', [], null, undefined, 'admin-1');
    expect(tx.workOrderTechnician.createMany).not.toHaveBeenCalled();
    expect(tx.workOrder.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ technicianId: null }) }));
  });


  it('automatically appoints a sole Technician and requires valid leadership for a team', async () => {
    const { service, tx } = harness();
    await service.assignTechnicians('wo-1', ['tech-1'], null, undefined, 'admin-1');
    expect(tx.workOrder.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ jobLeaderId: 'tech-1' }) }));
    await expect(service.assignTechnicians('wo-1', ['tech-1', 'tech-2'], null, undefined, 'admin-1')).rejects.toBeInstanceOf(BadRequestException);
    await service.assignTechnicians('wo-1', ['tech-1', 'tech-2'], null, 'tech-2', 'admin-1');
    expect(tx.workOrder.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ jobLeaderId: 'tech-2' }) }));
  });

  it('rejects a newly assigned inactive Technician or inactive Employee record', async () => {
    const { service, prisma } = harness();
    prisma.technician.findMany.mockResolvedValue([{ id: 'tech-3', status: 'INACTIVE', employeeRecord: null }]);
    await expect(service.assignTechnicians('wo-1', ['tech-3'], null, undefined, 'admin-1')).rejects.toBeInstanceOf(BadRequestException);
    prisma.technician.findMany.mockResolvedValue([{ id: 'tech-4', status: 'ACTIVE', employeeRecord: { status: 'INACTIVE' } }]);
    await expect(service.assignTechnicians('wo-1', ['tech-4'], null, undefined, 'admin-1')).rejects.toBeInstanceOf(BadRequestException);
  });
});
