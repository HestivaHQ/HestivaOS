import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, jest, afterEach } from '@jest/globals';
import { SupabaseAuthGuard } from './supabase-auth.guard';

describe('SupabaseAuthGuard application authorization', () => {
  afterEach(() => { jest.restoreAllMocks(); });

  function context(role: string, status = 'ACTIVE') {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    const request = { headers: { authorization: 'Bearer token' }, url: '/api/v1/users/admin' };
    const reflector = { getAllAndOverride: jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(['ADMIN']) };
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ id: 'user-1', authUserId: 'auth-1', role, status } as never) } };
    const execution = { getHandler: () => ({}), getClass: () => ({}), switchToHttp: () => ({ getRequest: () => request }) };
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ id: 'auth-1' }) } as Response);
    return { guard: new SupabaseAuthGuard(reflector as never, prisma as never), execution };
  }

  it('allows ADMIN to access administrator routes', async () => {
    const { guard, execution } = context('ADMIN');
    await expect(guard.canActivate(execution as never)).resolves.toBe(true);
  });

  it.each(['TECHNICIAN', 'SUPERVISOR', 'OPERATIONS_MANAGER', 'DISPATCHER'])('blocks %s from administrator routes', async (role) => {
    const { guard, execution } = context(role);
    await expect(guard.canActivate(execution as never)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks a disabled user on their next API request', async () => {
    const { guard, execution } = context('ADMIN', 'INACTIVE');
    await expect(guard.canActivate(execution as never)).rejects.toThrow('Hestiva OS access is disabled.');
  });
});
