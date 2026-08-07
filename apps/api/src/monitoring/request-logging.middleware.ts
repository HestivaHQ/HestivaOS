import { randomUUID } from 'node:crypto';
import { Injectable, type NestMiddleware } from '@nestjs/common';
import { JsonLogger } from './json-logger';
import type { CorrelatedRequest } from './request-context';

const REQUEST_ID_HEADER = 'x-request-id';
const VALID_REQUEST_ID = /^[A-Za-z0-9._:-]{1,128}$/;
type CorrelatedResponse = {
  on(event: 'finish', listener: () => void): void;
  setHeader(name: string, value: string): void;
  statusCode: number;
};

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new JsonLogger();

  use(request: CorrelatedRequest, response: CorrelatedResponse, next: () => void): void {
    const incomingId = request.header(REQUEST_ID_HEADER);
    const requestId = incomingId && VALID_REQUEST_ID.test(incomingId) ? incomingId : randomUUID();
    const startedAt = process.hrtime.bigint();
    request.requestId = requestId;
    response.setHeader(REQUEST_ID_HEADER, requestId);

    response.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      this.logger.event('info', {
        event: 'request_completed',
        requestId,
        method: request.method,
        path: request.originalUrl.split('?')[0],
        status: response.statusCode,
        durationMs: Number(durationMs.toFixed(3)),
      });
    });

    next();
  }
}
