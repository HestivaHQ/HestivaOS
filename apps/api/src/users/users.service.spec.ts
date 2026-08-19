import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
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
    const existing = { id: 'user-1', authUserId: 'auth-1', email: 'person@example.com', role: 'ADMIN', status: 'ACTIVE' };
    const { service, transaction } = createHarness(existing, [existing]);
    await expect(service.sync({ id: 'auth-1', email: ' Person@Example.com ' })).resolves.toEqual(existing);
    expect(transaction.user.update).not.toHaveBeenCalled();
    expect(transaction.user.create).not.toHaveBeenCalled();
  });

  it('reconciles a verified matching email while preserving the application user identity and relationships', async () => {
    const existing = { id: 'user-1', authUserId: 'stale-auth', email: 'person@example.com', role: 'ADMIN', status: 'ACTIVE', customers: [{ id: 'customer-1' }] };
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

  it('blocks an inactive application user during login synchronization', async () => {
    const inactive = { id: 'user-1', authUserId: 'auth-1', email: 'person@example.com', status: 'INACTIVE' };
    const { service } = createHarness(inactive, [inactive]);
    await expect(service.sync({ id: 'auth-1', email: 'person@example.com' })).rejects.toThrow('Hestiva OS access is disabled.');
  });
});

describe('UsersService administrator access management', () => {
  const admin = { id: 'admin-1', email: 'admin@example.com', firstName: 'Admin', lastName: 'One', displayName: 'Primary Admin', role: 'ADMIN', status: 'ACTIVE' };
  function adminHarness(target: any, activeAdmins = 1, history: any[] = []) {
    const transaction = {
      $executeRaw: jest.fn().mockResolvedValue(0 as never),
      user: {
        findUnique: jest.fn().mockImplementation(async ({ where }: any) => {
          if (where.id === admin.id) return admin;
          if (target && where.id === target.id) return target;
          return null;
        }),
        count: jest.fn().mockResolvedValue(activeAdmins as never),
        update: jest.fn().mockImplementation(async ({ data }: any) => ({ ...target, ...data })),
        findMany: jest.fn().mockResolvedValue([] as never),
      },
      userAccessChange: {
        create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'audit-1', ...data })),
        findMany: jest.fn().mockResolvedValue(history as never),
      },
    };
    const prisma = {
      user: transaction.user,
      userAccessChange: transaction.userAccessChange,
      $transaction: jest.fn().mockImplementation(async (callback: any) => callback(transaction)),
    };
    return { service: new UsersService(prisma as never), transaction };
  }

  it('changes another user role and records one atomic immutable audit event', async () => {
    const target = { id: 'user-2', email: 'tech@example.com', firstName: 'Tech', lastName: 'Two', displayName: null, role: 'TECHNICIAN', status: 'ACTIVE' };
    const { service, transaction } = adminHarness(target);
    await expect(service.updateRole(admin, 'user-2', { role: 'SUPERVISOR' as any })).resolves.toMatchObject({ role: 'SUPERVISOR' });
    expect(transaction.$executeRaw).toHaveBeenCalledTimes(1);
    expect(transaction.userAccessChange.create).toHaveBeenCalledWith({
      data: {
        targetUserId: 'user-2',
        targetEmail: 'tech@example.com',
        targetDisplayName: 'Tech Two',
        actorUserId: 'admin-1',
        actorEmail: 'admin@example.com',
        actorDisplayName: 'Primary Admin',
        oldRole: 'TECHNICIAN',
        newRole: 'SUPERVISOR',
        oldStatus: 'ACTIVE',
        newStatus: 'ACTIVE',
      },
    });
  });

  it('records access disablement with unchanged role and old/new status', async () => {
    const target = { id: 'user-2', email: 'tech@example.com', firstName: 'Tech', lastName: 'Two', displayName: 'Technician Two', role: 'TECHNICIAN', status: 'ACTIVE' };
    const { service, transaction } = adminHarness(target);
    await service.updateAccess(admin, target.id, { status: 'INACTIVE' as any });
    expect(transaction.userAccessChange.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ oldRole: 'TECHNICIAN', newRole: 'TECHNICIAN', oldStatus: 'ACTIVE', newStatus: 'INACTIVE' }),
    });
  });

  it('does not create an audit event for a no-op mutation', async () => {
    const target = { id: 'user-2', email: 'tech@example.com', firstName: 'Tech', lastName: 'Two', displayName: null, role: 'TECHNICIAN', status: 'ACTIVE' };
    const { service, transaction } = adminHarness(target);
    await service.updateAccess(admin, target.id, { status: 'ACTIVE' as any });
    expect(transaction.userAccessChange.create).not.toHaveBeenCalled();
  });

  it('returns the latest 100 access-history entries newest-first for an existing target', async () => {
    const target = { id: 'user-2', email: 'tech@example.com', firstName: 'Tech', lastName: 'Two', displayName: null, role: 'TECHNICIAN', status: 'ACTIVE' };
    const history = [{ id: 'audit-2' }, { id: 'audit-1' }];
    const { service, transaction } = adminHarness(target, 1, history);
    await expect(service.findAccessHistory(target.id)).resolves.toEqual(history);
    expect(transaction.userAccessChange.findMany).toHaveBeenCalledWith({
      where: { targetUserId: target.id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
  });

  it('rejects history reads for a missing target', async () => {
    const { service } = adminHarness(null);
    await expect(service.findAccessHistory('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects invalid role input', async () => {
    const { service } = adminHarness(null);
    await expect(service.updateRole(admin, 'user-2', { role: 'OWNER' as any })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('protects the last active administrator from demotion and disablement', async () => {
    const target = { id: 'admin-2', email: 'admin2@example.com', firstName: 'Admin', lastName: 'Two', displayName: null, role: 'ADMIN', status: 'ACTIVE' };
    const { service } = adminHarness(target, 1);
    await expect(service.updateRole(admin, target.id, { role: 'DISPATCHER' as any })).rejects.toBeInstanceOf(ConflictException);
    await expect(service.updateAccess(admin, target.id, { status: 'INACTIVE' as any })).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows another administrator to be demoted when an active administrator remains', async () => {
    const target = { id: 'admin-2', email: 'admin2@example.com', firstName: 'Admin', lastName: 'Two', displayName: null, role: 'ADMIN', status: 'ACTIVE' };
    const { service } = adminHarness(target, 2);
    await expect(service.updateRole(admin, target.id, { role: 'OPERATIONS_MANAGER' as any })).resolves.toMatchObject({ role: 'OPERATIONS_MANAGER' });
  });

  it('disables and re-enables another user', async () => {
    const target = { id: 'user-2', email: 'tech@example.com', firstName: 'Tech', lastName: 'Two', displayName: null, role: 'TECHNICIAN', status: 'ACTIVE' };
    const { service } = adminHarness(target);
    await expect(service.updateAccess(admin, target.id, { status: 'INACTIVE' as any })).resolves.toMatchObject({ status: 'INACTIVE' });
    target.status = 'INACTIVE';
    await expect(service.updateAccess(admin, target.id, { status: 'ACTIVE' as any })).resolves.toMatchObject({ status: 'ACTIVE' });
  });

  it('prevents self-demotion and self-disablement', async () => {
    const { service } = adminHarness(admin, 2);
    await expect(service.updateRole(admin, admin.id, { role: 'TECHNICIAN' as any })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.updateAccess(admin, admin.id, { status: 'INACTIVE' as any })).rejects.toBeInstanceOf(ForbiddenException);
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
