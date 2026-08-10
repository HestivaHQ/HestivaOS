import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { EmployeeStatus, UserStatus } from '@prisma/client';
import { EmployeesService } from './employees.service';

describe('EmployeesService', () => {
  const employeeRecord: any = { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() };
  const service = new EmployeesService({ employeeRecord } as never);
  beforeEach(() => { jest.resetAllMocks(); });

  it('returns a lean list without emergency contacts, address, or internal notes', async () => {
    employeeRecord.findMany.mockResolvedValue([]); await service.list('Ada');
    const select = employeeRecord.findMany.mock.calls[0][0].select;
    expect(select).not.toHaveProperty('emergencyContactName'); expect(select).not.toHaveProperty('residentialAddress'); expect(select).not.toHaveProperty('internalNotes');
    expect(select).toMatchObject({ firstName: true, phone: true, email: true, status: true });
  });

  it('creates an employee without a User or Technician link and keeps optional fields blank', async () => {
    const stored = { id: 'employee-id', employeeReference: 'EMP-12', firstName: 'Ada', lastName: 'Ndlovu', status: EmployeeStatus.ACTIVE, user: null, technician: null };
    employeeRecord.create.mockResolvedValue(stored); employeeRecord.findUnique.mockResolvedValue(stored);
    await expect(service.create({ employeeReference: ' EMP-12 ', firstName: ' Ada ', lastName: ' Ndlovu ' })).resolves.toMatchObject({ user: null, technician: null });
    expect(employeeRecord.create.mock.calls[0][0].data).toMatchObject({ employeeReference: 'EMP-12', firstName: 'Ada', lastName: 'Ndlovu' });
  });

  it('rejects unsupported fields and invalid contact email', async () => {
    await expect(service.create({ employeeReference: 'EMP-1', firstName: 'A', lastName: 'B', salary: 100 } as never)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create({ employeeReference: 'EMP-1', firstName: 'A', lastName: 'B', email: 'not-an-email' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an end date before the start date', async () => {
    await expect(service.create({ employeeReference: 'EMP-1', firstName: 'A', lastName: 'B', startDate: '2026-08-10', endDate: '2026-08-09' })).rejects.toThrow('End date cannot be before start date.');
  });

  it('updates employment status without mutating User status or Technician relationships', async () => {
    const current = { id: 'employee-id', status: EmployeeStatus.ACTIVE, user: { status: UserStatus.INACTIVE }, technician: { id: 'tech-id' }, startDate: null, endDate: null };
    employeeRecord.findUnique.mockResolvedValueOnce(current).mockResolvedValueOnce({ ...current, status: EmployeeStatus.INACTIVE }); employeeRecord.update.mockResolvedValue({ ...current, status: EmployeeStatus.INACTIVE });
    await service.update('employee-id', { status: EmployeeStatus.INACTIVE });
    expect(employeeRecord.update.mock.calls[0][0].data).toEqual(expect.objectContaining({ status: EmployeeStatus.INACTIVE }));
    expect(employeeRecord.update.mock.calls[0][0].data).not.toHaveProperty('user'); expect(employeeRecord.update.mock.calls[0][0].data).not.toHaveProperty('technicianId');
  });

  it('retains inactive employees because no delete operation is exposed', () => {
    expect(typeof service.update).toBe('function'); expect(service).not.toHaveProperty('delete');
  });
});
