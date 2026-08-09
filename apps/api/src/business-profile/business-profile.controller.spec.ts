import { describe, expect, it } from '@jest/globals';
import { ROLES_KEY } from '../users/roles.decorator';
import { BusinessProfileController } from './business-profile.controller';

describe('BusinessProfileController authorization', () => {
  it('requires ADMIN for both direct reads and writes', () => {
    expect(Reflect.getMetadata(ROLES_KEY, BusinessProfileController)).toEqual(['ADMIN']);
  });
});
