import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { JsonLogger } from './json-logger';

describe('JsonLogger', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('includes a message for structured error events so log platforms can render them', () => {
    const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const logger = new JsonLogger();

    logger.event(
      'error',
      {
        event: 'request_failed',
        endpoint: '/api/v1/integrations/website/quotes',
        status: 400,
      },
      'Error: invalid quote',
    );

    expect(stderr).toHaveBeenCalledTimes(1);
    const raw = String(stderr.mock.calls[0]?.[0] ?? '').trim();
    const record = JSON.parse(raw) as Record<string, unknown>;

    expect(record.message).toBe('request_failed');
    expect(record.event).toBe('request_failed');
    expect(record.endpoint).toBe('/api/v1/integrations/website/quotes');
    expect(record.status).toBe(400);
    expect(record.stack).toBe('Error: invalid quote');
  });

  it('uses a safe fallback message when an event field is absent', () => {
    const stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const logger = new JsonLogger();

    logger.event('info', { status: 200 });

    expect(stdout).toHaveBeenCalledTimes(1);
    const raw = String(stdout.mock.calls[0]?.[0] ?? '').trim();
    const record = JSON.parse(raw) as Record<string, unknown>;

    expect(record.message).toBe('application_event');
    expect(record.status).toBe(200);
  });
});
