import { describe, expect, it } from '@jest/globals';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../users/roles.decorator';
import { BusinessListsController } from './business-lists.controller';

describe('BusinessListsController authorization', () => {
  it('allows authenticated consumers to list options but requires ADMIN to manage them', () => {
    expect(Reflect.getMetadata(ROLES_KEY, BusinessListsController.prototype.list)).toBeUndefined();
    expect(Reflect.getMetadata(ROLES_KEY, BusinessListsController.prototype.create)).toEqual([UserRole.ADMIN]);
    expect(Reflect.getMetadata(ROLES_KEY, BusinessListsController.prototype.update)).toEqual([UserRole.ADMIN]);
  });
});
