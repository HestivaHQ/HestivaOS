import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import { JsonLogger } from './json-logger';
import type { CorrelatedRequest } from './request-context';

@Catch()
export class StructuredExceptionFilter extends BaseExceptionFilter {
  private readonly structuredLogger = new JsonLogger();

  constructor(adapterHost: HttpAdapterHost) {
    super(adapterHost.httpAdapter);
  }

  override catch(exception: unknown, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<CorrelatedRequest>();
    const error = exception instanceof Error ? exception : new Error('Unknown request error');
    const status = exception instanceof HttpException ? exception.getStatus() : 500;

    this.structuredLogger.event('error', {
      event: 'request_failed',
      requestId: request.requestId ?? 'unavailable',
      endpoint: request.originalUrl.split('?')[0],
      status,
      environment: process.env.NODE_ENV ?? 'development',
    }, error.stack);
    super.catch(exception, host);
  }
}
