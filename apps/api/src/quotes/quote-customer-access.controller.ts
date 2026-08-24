import {
  Body,
  Controller,
  Headers,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from '../users/current-user.decorator';
import { Public } from '../users/public.decorator';
import { Roles } from '../users/roles.decorator';
import { QuoteCustomerAccessService } from './quote-customer-access.service';

type PublicRequest = { socket?: { remoteAddress?: string | null } };
type PublicResponse = { setHeader(name: string, value: string): void };

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const buckets = new Map<string, { startedAt: number; count: number }>();

function applyPublicHeaders(response: PublicResponse): void {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  response.setHeader('Referrer-Policy', 'no-referrer');
}

function enforceRateLimit(request: PublicRequest): void {
  const key = request.socket?.remoteAddress || 'unknown-peer';
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || now - current.startedAt >= RATE_LIMIT_WINDOW_MS) {
    buckets.set(key, { startedAt: now, count: 1 });
    return;
  }
  current.count += 1;
  if (current.count > RATE_LIMIT_MAX) {
    throw new HttpException('Too many requests.', HttpStatus.TOO_MANY_REQUESTS);
  }
}

function capabilityFromAuthorization(value: string | undefined): string {
  const match = value?.match(/^QuoteCapability ([A-Za-z0-9_-]{43})$/);
  return match?.[1] ?? '';
}

@Controller('quotes')
@Roles(UserRole.ADMIN)
export class QuoteCustomerAccessAdminController {
  constructor(private readonly access: QuoteCustomerAccessService) {}

  @Post(':id/customer-access')
  issue(
    @Param('id', new ParseUUIDPipe()) quoteId: string,
    @Body('expectedRevisionNumber', ParseIntPipe) expectedRevisionNumber: number,
    @CurrentUser() user: User,
  ) {
    return this.access.issue({ quoteId, expectedRevisionNumber, actorUserId: user.id });
  }

  @Post(':id/customer-access/revoke')
  revoke(
    @Param('id', new ParseUUIDPipe()) quoteId: string,
    @Body('expectedRevisionNumber', ParseIntPipe) expectedRevisionNumber: number,
    @CurrentUser() user: User,
  ) {
    return this.access.revoke(quoteId, expectedRevisionNumber, user.id);
  }
}

@Controller('public/quote-access')
export class QuoteCustomerAccessPublicController {
  constructor(private readonly access: QuoteCustomerAccessService) {}

  @Public()
  @Post('resolve')
  async resolve(
    @Headers('authorization') authorization: string | undefined,
    @Req() request: PublicRequest,
    @Res({ passthrough: true }) response: PublicResponse,
  ) {
    applyPublicHeaders(response);
    enforceRateLimit(request);
    return this.access.resolve(capabilityFromAuthorization(authorization));
  }
}

export const QUOTE_CUSTOMER_PUBLIC_ROUTE_SECURITY = {
  authorizationScheme: 'QuoteCapability',
  rateLimitWindowMs: RATE_LIMIT_WINDOW_MS,
  rateLimitMax: RATE_LIMIT_MAX,
} as const;
