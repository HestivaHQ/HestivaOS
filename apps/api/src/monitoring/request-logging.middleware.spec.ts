import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { JsonLogger } from './json-logger';
import { RequestLoggingMiddleware } from './request-logging.middleware';

class TestResponse extends EventEmitter {
  readonly headers: Record<string, string> = {};
  statusCode = 204;

  setHeader(name: string, value: string): void {
    this.headers[name] = value;
  }
}

describe('RequestLoggingMiddleware', () => {
  let eventSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    eventSpy = jest
      .spyOn(JsonLogger.prototype, 'event')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    eventSpy.mockRestore();
  });

  it('propagates a safe incoming request ID to context and response', () => {
    const middleware = new RequestLoggingMiddleware();
    const request = {
      header: () => 'client-request-123',
      method: 'GET',
      originalUrl: '/api/v1/health',
    };
    const response = new TestResponse();
    const next = jest.fn();

    middleware.use(request, response, next);

    expect(request).toHaveProperty('requestId', 'client-request-123');
    expect(response.headers['x-request-id']).toBe('client-request-123');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('generates and returns a request ID when none is supplied', () => {
    const middleware = new RequestLoggingMiddleware();
    const request: {
      header: () => undefined;
      method: string;
      originalUrl: string;
      requestId?: string;
    } = { header: () => undefined, method: 'POST', originalUrl: '/api/v1/ready' };
    const response = new TestResponse();

    middleware.use(request, response, jest.fn());

    expect(request).toHaveProperty('requestId', expect.stringMatching(/^[0-9a-f-]{36}$/));
    expect(response.headers['x-request-id']).toBe(request.requestId);
  });

  it('logs correlated request fields without headers, query strings, or secrets', () => {
    const middleware = new RequestLoggingMiddleware();
    const request = {
      header: () => 'correlation-id',
      method: 'GET',
      originalUrl: '/api/v1/ready?token=do-not-log',
    };
    const response = new TestResponse();

    middleware.use(request, response, jest.fn());
    response.emit('finish');

    expect(eventSpy).toHaveBeenCalledWith('info', expect.objectContaining({
      event: 'request_completed',
      requestId: 'correlation-id',
      method: 'GET',
      path: '/api/v1/ready',
      status: 204,
      durationMs: expect.any(Number),
    }));
    const loggedRecord = eventSpy.mock.calls[0][1];
    expect(loggedRecord).not.toHaveProperty('headers');
    expect(JSON.stringify(loggedRecord)).not.toContain('do-not-log');
  });
});
