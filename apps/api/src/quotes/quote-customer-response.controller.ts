import { Body, Controller, Get, Headers, HttpException, HttpStatus, Param, ParseIntPipe, ParseUUIDPipe, Post, Query, Req, Res } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Public } from '../users/public.decorator';
import { Roles } from '../users/roles.decorator';
import { QuoteCustomerResponseService } from './quote-customer-response.service';

type PublicRequest = { socket?: { remoteAddress?: string | null } };
type PublicResponse = { setHeader(name: string, value: string): void };
type RateBucket = { startedAt: number; count: number };
const WINDOW_MS = 60_000;
const RESPONSE_MAX = 10;

function capability(value: string | undefined) { return value?.match(/^QuoteCapability ([A-Za-z0-9_-]{43})$/)?.[1] ?? ''; }
function headers(response: PublicResponse) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  response.setHeader('Referrer-Policy', 'no-referrer');
}

@Controller('public/quote-access')
export class QuoteCustomerResponsePublicController {
  private readonly buckets = new Map<string, RateBucket>();
  constructor(private readonly responses: QuoteCustomerResponseService) {}

  @Public()
  @Post('respond')
  respond(@Headers('authorization') authorization: string | undefined, @Body('decision') decision: 'CUSTOMER_ACCEPTED' | 'CUSTOMER_DECLINED', @Body('idempotencyKey') idempotencyKey: string, @Body('confirmed') confirmed: boolean, @Req() request: PublicRequest, @Res({ passthrough: true }) response: PublicResponse) {
    headers(response);
    const peer = request.socket?.remoteAddress || 'unknown-peer';
    const now = Date.now();
    const bucket = this.buckets.get(peer);
    if (!bucket || now - bucket.startedAt >= WINDOW_MS) this.buckets.set(peer, { startedAt: now, count: 1 });
    else if (++bucket.count > RESPONSE_MAX) throw new HttpException('Too many requests.', HttpStatus.TOO_MANY_REQUESTS);
    return this.responses.respond(capability(authorization), decision, typeof idempotencyKey === 'string' ? idempotencyKey : '', confirmed === true);
  }
}

@Controller('quotes')
@Roles(UserRole.ADMIN)
export class QuoteCustomerResponseAdminController {
  constructor(private readonly responses: QuoteCustomerResponseService) {}
  @Get(':id/customer-access/response')
  summary(@Param('id', new ParseUUIDPipe()) quoteId: string, @Query('expectedRevisionNumber', ParseIntPipe) expectedRevisionNumber: number) {
    return this.responses.summary(quoteId, expectedRevisionNumber);
  }
}

export const QUOTE_CUSTOMER_RESPONSE_ROUTE_SECURITY = { rateLimitWindowMs: WINDOW_MS, responseRateLimitMax: RESPONSE_MAX, authorizationScheme: 'QuoteCapability' } as const;
