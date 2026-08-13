import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { generateKeyPairSync, sign } from 'node:crypto';
import { SupabaseAuthGuard } from './supabase-auth.guard';

const SUPABASE_URL = 'https://example.supabase.co';
const KID = 'test-key';

function tokenFor(overrides: Record<string, unknown> = {}) {
  const { privateKey, publicKey } = generateKeyPairSync('ec', {
    namedCurve: 'P-256',
  });
  const header = Buffer.from(
    JSON.stringify({ alg: 'ES256', kid: KID, typ: 'JWT' }),
  ).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: 'auth-1',
      aud: 'authenticated',
      iss: `${SUPABASE_URL}/auth/v1`,
      exp: Math.floor(Date.now() / 1000) + 300,
      ...overrides,
    }),
  ).toString('base64url');
  const signature = sign(
    'sha256',
    Buffer.from(`${header}.${payload}`),
    { key: privateKey, dsaEncoding: 'ieee-p1363' },
  ).toString('base64url');
  const jwk = publicKey.export({ format: 'jwk' });
  return {
    token: `${header}.${payload}.${signature}`,
    jwk: { ...jwk, kid: KID, alg: 'ES256', use: 'sig' },
  };
}

describe('SupabaseAuthGuard application authorization', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });

  function context(role: string, status = 'ACTIVE', overrides: Record<string, unknown> = {}) {
    process.env.SUPABASE_URL = SUPABASE_URL;
    const signed = tokenFor(overrides);
    const request = {
      headers: { authorization: `Bearer ${signed.token}` },
      url: '/api/v1/users/admin',
    };
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(['ADMIN']),
    };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          authUserId: 'auth-1',
          role,
          status,
        } as never),
      },
    };
    const execution = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => request }),
    };
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ keys: [signed.jwk] }),
    } as Response);
    return {
      guard: new SupabaseAuthGuard(reflector as never, prisma as never),
      execution,
      request,
    };
  }

  it('allows ADMIN to access administrator routes with a valid locally verified ES256 token', async () => {
    const { guard, execution, request } = context('ADMIN');
    await expect(guard.canActivate(execution as never)).resolves.toBe(true);
    expect(request).toHaveProperty('supabaseUser.id', 'auth-1');
  });

  it.each(['TECHNICIAN', 'SUPERVISOR', 'OPERATIONS_MANAGER', 'DISPATCHER'])(
    'blocks %s from administrator routes',
    async (role) => {
      const { guard, execution } = context(role);
      await expect(guard.canActivate(execution as never)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    },
  );

  it('blocks a disabled user on their next API request', async () => {
    const { guard, execution } = context('ADMIN', 'INACTIVE');
    await expect(guard.canActivate(execution as never)).rejects.toThrow(
      'Hestiva OS access is disabled.',
    );
  });

  it('rejects an expired token before application authorization', async () => {
    const { guard, execution } = context('ADMIN', 'ACTIVE', {
      exp: Math.floor(Date.now() / 1000) - 120,
    });
    await expect(guard.canActivate(execution as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a token for the wrong audience', async () => {
    const { guard, execution } = context('ADMIN', 'ACTIVE', { aud: 'anon' });
    await expect(guard.canActivate(execution as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
