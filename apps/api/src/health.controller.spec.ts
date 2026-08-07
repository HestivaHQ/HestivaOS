import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { HealthController } from './health.controller';
import { APPLICATION_VERSION } from './monitoring/application-version';

describe('HealthController', () => {
  const originalEnvironment = process.env;
  const queryRaw = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const controller = new HealthController({ $queryRaw: queryRaw } as never);

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnvironment };
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  it('reports healthy process metadata', () => {
    const result = controller.getHealth();

    expect(result.status).toBe('healthy');
    expect(result.uptime).toEqual(expect.any(Number));
    expect(result.version).toBe(APPLICATION_VERSION);
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });

  it('reports ready when the database succeeds and Supabase is not configured', async () => {
    queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
    const response = { status: jest.fn() };

    const result = await controller.getReadiness(response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(result.status).toBe('ready');
    expect(result.checks).toEqual({
      process: 'healthy',
      database: 'connected',
      supabase: 'not_configured',
    });
  });

  it('reports HTTP 503 and not ready when the database fails', async () => {
    queryRaw.mockRejectedValueOnce(new Error('database unavailable'));
    const response = { status: jest.fn() };

    const result = await controller.getReadiness(response);

    expect(response.status).toHaveBeenCalledWith(503);
    expect(result.status).toBe('not_ready');
    expect(result.checks.database).toBe('unavailable');
  });

  it('checks configured Supabase without exposing its key', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co/';
    process.env.SUPABASE_ANON_KEY = 'test-secret-key';
    queryRaw.mockResolvedValueOnce([]);
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true } as Response);

    const result = await controller.getReadiness({ status: jest.fn() });

    expect(result.checks.supabase).toBe('connected');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/auth/v1/health',
      expect.objectContaining({ headers: { apikey: 'test-secret-key' } }),
    );
    expect(JSON.stringify(result)).not.toContain('test-secret-key');
    fetchMock.mockRestore();
  });

  it('reports unready for partial Supabase configuration without calling fetch', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    queryRaw.mockResolvedValueOnce([]);
    const fetchMock = jest.spyOn(global, 'fetch');
    const response = { status: jest.fn() };

    const result = await controller.getReadiness(response);

    expect(response.status).toHaveBeenCalledWith(503);
    expect(result.checks.supabase).toBe('unavailable');
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });
});
