import { ConflictException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { UsersService } from './users.service';

function createHarness(authMatch: unknown, emailMatches: unknown[] = []) {
  const transaction = {
    user: {
      findUnique: jest.fn().mockResolvedValue(authMatch as never),
      findMany: jest.fn().mockResolvedValue(emailMatches as never),
      update: jest.fn().mockImplementation(async ({ data, where }: any) => ({ ...((authMatch ?? emailMatches.find((user: any) => user.id === where.id)) as Record<string, unknown>), ...data })),
      create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'new-user', ...data })),
    },
  };
  const prisma = {
    user: transaction.user,
    $transaction: jest.fn().mockImplementation(async (callback: any) => callback(transaction)),
  };
  return { service: new UsersService(prisma as never), transaction };
}

describe('UsersService auth identity synchronization', () => {
  it('returns the existing user when the Auth UUID and normalized email match', async () => {
    const existing = { id: 'user-1', authUserId: 'auth-1', email: 'person@example.com', role: 'ADMIN' };
    const { service, transaction } = createHarness(existing, [existing]);
    await expect(service.sync({ id: 'auth-1', email: ' Person@Example.com ' })).resolves.toEqual(existing);
    expect(transaction.user.update).not.toHaveBeenCalled();
    expect(transaction.user.create).not.toHaveBeenCalled();
  });

  it('reconciles a verified matching email while preserving the application user identity and relationships', async () => {
    const existing = { id: 'user-1', authUserId: 'stale-auth', email: 'person@example.com', role: 'ADMIN', customers: [{ id: 'customer-1' }] };
    const { service, transaction } = createHarness(null, [existing]);
    const result = await service.sync({ id: 'new-auth', email: ' PERSON@example.com ', email_confirmed_at: '2026-08-09T00:00:00Z' });
    expect(result).toMatchObject({ id: 'user-1', authUserId: 'new-auth', role: 'ADMIN', customers: [{ id: 'customer-1' }] });
    expect(transaction.user.update).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { authUserId: 'new-auth', email: 'person@example.com' } });
    expect(transaction.user.create).not.toHaveBeenCalled();
  });

  it('does not rebind an existing account for an unverified email', async () => {
    const existing = { id: 'user-1', authUserId: 'stale-auth', email: 'person@example.com' };
    const { service, transaction } = createHarness(null, [existing]);
    await expect(service.sync({ id: 'new-auth', email: 'person@example.com', email_confirmed_at: null })).rejects.toBeInstanceOf(ForbiddenException);
    expect(transaction.user.update).not.toHaveBeenCalled();
    expect(transaction.user.create).not.toHaveBeenCalled();
  });

  it('fails closed when normalized email matches are ambiguous', async () => {
    const { service, transaction } = createHarness(null, [
      { id: 'user-1', authUserId: 'old-1', email: 'person@example.com' },
      { id: 'user-2', authUserId: 'old-2', email: 'PERSON@example.com' },
    ]);
    await expect(service.sync({ id: 'new-auth', email: 'person@example.com', email_confirmed_at: '2026-08-09T00:00:00Z' })).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.user.update).not.toHaveBeenCalled();
  });

  it('creates the repository default application user when no match exists', async () => {
    const { service, transaction } = createHarness(null);
    await expect(service.sync({ id: 'auth-new', email: ' New@Example.com ', user_metadata: { full_name: 'New Person' } })).resolves.toMatchObject({
      id: 'new-user', authUserId: 'auth-new', email: 'new@example.com', firstName: 'New', lastName: 'Person', role: 'TECHNICIAN', status: 'ACTIVE',
    });
    expect(transaction.user.create).toHaveBeenCalledTimes(1);
  });

  it('fails closed when an existing Auth UUID email change conflicts with another user', async () => {
    const authMatch = { id: 'user-1', authUserId: 'auth-1', email: 'old@example.com' };
    const { service, transaction } = createHarness(authMatch, [{ id: 'user-2', authUserId: 'auth-2', email: 'new@example.com' }]);
    await expect(service.sync({ id: 'auth-1', email: 'new@example.com' })).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.user.update).not.toHaveBeenCalled();
  });
});

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
