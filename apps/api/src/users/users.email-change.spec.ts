import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { UsersService } from './users.service';

function harness(current: { id: string; authUserId: string; email: string } | null, conflict: { id: string } | null = null) {
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(current as never),
      findFirst: jest.fn().mockResolvedValue(conflict as never),
    },
  };
  return { service: new UsersService(prisma as never), prisma };
}

describe('UsersService email-change preflight', () => {
  it('normalizes and permits an unused different email', async () => {
    const { service, prisma } = harness({ id: 'user-1', authUserId: 'auth-1', email: 'old@example.com' });
    await expect(service.preflightEmailChange('auth-1', ' New@Example.com ')).resolves.toEqual({ email: 'new@example.com', allowed: true });
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: { not: 'user-1' }, email: { equals: 'new@example.com', mode: 'insensitive' } },
      select: { id: true },
    });
  });

  it('rejects the current email after normalization', async () => {
    const { service, prisma } = harness({ id: 'user-1', authUserId: 'auth-1', email: 'person@example.com' });
    await expect(service.preflightEmailChange('auth-1', ' PERSON@example.com ')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('rejects a known application-user email conflict before provider change', async () => {
    const { service } = harness({ id: 'user-1', authUserId: 'auth-1', email: 'old@example.com' }, { id: 'user-2' });
    await expect(service.preflightEmailChange('auth-1', 'taken@example.com')).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects malformed email input before querying for conflicts', async () => {
    const { service, prisma } = harness({ id: 'user-1', authUserId: 'auth-1', email: 'old@example.com' });
    await expect(service.preflightEmailChange('auth-1', 'not-an-email')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });
});
