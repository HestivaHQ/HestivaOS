import { describe, expect, it } from '@jest/globals';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../users/roles.decorator';
import { CorrespondenceRecordsController } from './correspondence-records.controller';
import { CorrespondenceController } from './correspondence.controller';

describe('Correspondence controllers', () => {
  it('restricts template management to ADMIN', () => {
    expect(Reflect.getMetadata(ROLES_KEY, CorrespondenceController)).toEqual([UserRole.ADMIN]);
  });

  it('restricts rendered correspondence history to ADMIN', () => {
    expect(Reflect.getMetadata(ROLES_KEY, CorrespondenceRecordsController)).toEqual([UserRole.ADMIN]);
  });
});
