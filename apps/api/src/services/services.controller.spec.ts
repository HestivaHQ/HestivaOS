import { UserRole } from '@prisma/client';
import { describe, expect, it } from '@jest/globals';
import { ROLES_KEY } from '../users/roles.decorator';
import { ServicesController } from './services.controller';

describe('ServicesController authorization', () => {
  it('allows authenticated users to read but only ADMIN to manage the catalogue', () => {
    expect(Reflect.getMetadata(ROLES_KEY, ServicesController.prototype.findAll)).toBeUndefined();
    expect(Reflect.getMetadata(ROLES_KEY, ServicesController.prototype.findOne)).toBeUndefined();
    expect(Reflect.getMetadata(ROLES_KEY, ServicesController.prototype.create)).toEqual([UserRole.ADMIN]);
    expect(Reflect.getMetadata(ROLES_KEY, ServicesController.prototype.update)).toEqual([UserRole.ADMIN]);
  });

  it.each([UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.OPERATIONS_MANAGER, UserRole.DISPATCHER])('denies %s management', (role: UserRole) => {
    expect(Reflect.getMetadata(ROLES_KEY, ServicesController.prototype.create)).not.toContain(role);
    expect(Reflect.getMetadata(ROLES_KEY, ServicesController.prototype.update)).not.toContain(role);
  });
});
