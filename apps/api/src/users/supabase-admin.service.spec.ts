import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { SupabaseAdminService } from './supabase-admin.service';

describe('SupabaseAdminService', () => {
  it('rejects an invalid invitation email before provider access', async () => {
    const prisma = { user: { findUnique: jest.fn() }, $executeRaw: jest.fn() };
    const service = new SupabaseAdminService(prisma as never);
    await expect(service.inviteUser('not-an-email')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('fails closed when invitation administration is not configured', async () => {
    const previousUrl = process.env.SUPABASE_URL;
    const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    try {
      const prisma = { user: { findUnique: jest.fn() }, $executeRaw: jest.fn() };
      const service = new SupabaseAdminService(prisma as never);
      await expect(service.inviteUser('person@example.com')).rejects.toBeInstanceOf(ServiceUnavailableException);
    } finally {
      if (previousUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = previousUrl;
      if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
    }
  });

  it('removes provider sessions for the canonical application identity', async () => {
    const executeRaw = jest.fn().mockResolvedValue(2 as never);
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ authUserId: '11111111-1111-1111-1111-111111111111' } as never) },
      $executeRaw: executeRaw,
    };
    const service = new SupabaseAdminService(prisma as never);
    await service.revokeRefreshSessionsForApplicationUser('app-user-1');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'app-user-1' }, select: { authUserId: true } });
    expect(executeRaw).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the application user has no provider identity', async () => {
    const executeRaw = jest.fn();
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(null as never) }, $executeRaw: executeRaw };
    const service = new SupabaseAdminService(prisma as never);
    await service.revokeRefreshSessionsForApplicationUser('missing');
    expect(executeRaw).not.toHaveBeenCalled();
  });

  it('reports provider revocation failure without implying OS access was restored', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ authUserId: '11111111-1111-1111-1111-111111111111' } as never) },
      $executeRaw: jest.fn().mockRejectedValue(new Error('permission denied') as never),
    };
    const service = new SupabaseAdminService(prisma as never);
    await expect(service.revokeRefreshSessionsForApplicationUser('app-user-1')).rejects.toThrow('OS access is disabled, but provider session revocation could not be completed.');
  });
});
