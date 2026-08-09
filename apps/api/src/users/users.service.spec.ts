import { describe, expect, it, jest } from '@jest/globals';
import { UsersService } from './users.service';

describe('UsersService personal profile boundary', () => {
  it('updates approved personal fields and preserves profile photos', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'user-1' } as never);
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ id: 'user-1' } as never), update } };
    const service = new UsersService(prisma as never);
    await service.updateProfile('auth-1', { firstName: ' Ada ', lastName: ' Lovelace ', displayName: ' Ada ', phoneNumber: ' 123 ', profilePhotoUrl: ' https://example.test/photo.jpg ' });
    expect(update).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { firstName: 'Ada', lastName: 'Lovelace', displayName: 'Ada', phoneNumber: '123', profilePhotoUrl: 'https://example.test/photo.jpg' } });
  });

  it('ignores role, job title, and department supplied at runtime', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'user-1' } as never);
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ id: 'user-1' } as never), update } };
    const service = new UsersService(prisma as never);
    await service.updateProfile('auth-1', { firstName: 'Grace', role: 'ADMIN', jobTitle: 'Owner', department: 'Management' } as never);
    expect(update).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { firstName: 'Grace' } });
  });
});
