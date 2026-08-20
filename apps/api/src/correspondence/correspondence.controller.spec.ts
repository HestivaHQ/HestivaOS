import { describe, expect, it } from '@jest/globals';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../users/roles.decorator';
import { CorrespondenceController } from './correspondence.controller';

describe('CorrespondenceController', () => {
  it('is restricted to ADMIN', () => {
    expect(Reflect.getMetadata(ROLES_KEY, CorrespondenceController)).toEqual([UserRole.ADMIN]);
  });
});
