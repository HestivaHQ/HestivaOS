import { describe, expect, it } from '@jest/globals';
import { ROLES_KEY } from '../users/roles.decorator';
import { UserRole } from '@prisma/client';
import { EmployeesController } from './employees.controller';
describe('EmployeesController authorization', () => {
  it('requires ADMIN for every employee route', () => { expect(Reflect.getMetadata(ROLES_KEY, EmployeesController)).toEqual([UserRole.ADMIN]); });
  it.each([UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.OPERATIONS_MANAGER, UserRole.DISPATCHER])('does not grant %s access', (role) => { expect(Reflect.getMetadata(ROLES_KEY, EmployeesController)).not.toContain(role); });
});
