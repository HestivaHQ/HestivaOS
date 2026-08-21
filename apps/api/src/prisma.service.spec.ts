import { describe, expect, it } from '@jest/globals';
import { PRISMA_CONNECTION_LIMIT, withPrismaConnectionLimit } from './prisma.service';

describe('PrismaService connection configuration', () => {
  it('caps the process-local Prisma pool while preserving existing URL parameters', () => {
    const result = withPrismaConnectionLimit(
      'postgresql://postgres:secret@example.supabase.co:5432/postgres?schema=public&connect_timeout=10',
    );
    const url = new URL(result);

    expect(PRISMA_CONNECTION_LIMIT).toBe(5);
    expect(url.searchParams.get('connection_limit')).toBe('5');
    expect(url.searchParams.get('schema')).toBe('public');
    expect(url.searchParams.get('connect_timeout')).toBe('10');
    expect(url.username).toBe('postgres');
    expect(url.password).toBe('secret');
  });

  it('overrides an unsafe pre-existing connection_limit instead of inheriting it', () => {
    const result = withPrismaConnectionLimit(
      'postgresql://postgres:secret@example.supabase.co:5432/postgres?connection_limit=50',
    );

    expect(new URL(result).searchParams.get('connection_limit')).toBe('5');
  });
});
