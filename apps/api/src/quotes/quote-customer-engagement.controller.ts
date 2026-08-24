import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Public } from '../users/public.decorator';
import { Roles } from '../users/roles.decorator';
import {
  QuoteCustomerEngagementService,
} from './quote-customer-engagement.service';

type PublicRequest = { socket?: { remoteAddress?: string | null } };
type PublicResponse = { setHeader(name: string, value: string): void };

type RateBucket = { startedAt: number; count: number };
const RATE_LIMIT_WINDOW_MS = 60_000;
const CHALLENGE_RATE_LIMIT_MAX = 10;
const CONFIRM_RATE_LIMIT_MAX = 30;
const buckets = new Map<string, RateBucket>();

function applyPublicHeaders(response: PublicResponse): void {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  response.setHeader('Referrer-Policy', 'no-referrer');
}

function enforceRateLimit(request: PublicRequest, operation: string, maximum: number): void {
  const peer = request.socket?.remoteAddress || 'unknown-peer';
  const key = `${operation}:${peer}`;
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || now - current.startedAt >= RATE_LIMIT_WINDOW_MS) {
    buckets.set(key, { startedAt: now, count: 1 });
    return;
  }
  current.count += 1;
  if (current.count > maximum) {
    throw new HttpException('Too many requests.', HttpStatus.TOO_MANY_REQUESTS);
  }
}

function capabilityFromAuthorization(value: string | undefined): string {
  const match = value?.match(/^QuoteCapability ([A-Za-z0-9_-]{43})$/);
  return match?.[1] ?? '';
}

@Controller('public/quote-access')
export class QuoteCustomerEngagementPublicController {
  constructor(private readonly engagement: QuoteCustomerEngagementService) {}

  @Public()
  @Post('view-challenge')
  issueViewChallenge(
    @Headers('authorization') authorization: string | undefined,
    @Req() request: PublicRequest,
    @Res({ passthrough: true }) response: PublicResponse,
  ) {
    applyPublicHeaders(response);
    enforceRateLimit(request, 'view-challenge', CHALLENGE_RATE_LIMIT_MAX);
    return this.engagement.issueViewChallenge(capabilityFromAuthorization(authorization));
  }

  @Public()
  @Post('view-confirm')
  confirmView(
    @Headers('authorization') authorization: string | undefined,
    @Body('challenge') challenge: string,
    @Body('pageVisible') pageVisible: boolean,
    @Req() request: PublicRequest,
    @Res({ passthrough: true }) response: PublicResponse,
  ) {
    applyPublicHeaders(response);
    enforceRateLimit(request, 'view-confirm', CONFIRM_RATE_LIMIT_MAX);
    return this.engagement.confirmView(
      capabilityFromAuthorization(authorization),
      typeof challenge === 'string' ? challenge : '',
      pageVisible === true,
    );
  }
}

@Controller('quotes')
@Roles(UserRole.ADMIN)
export class QuoteCustomerEngagementAdminController {
  constructor(private readonly engagement: QuoteCustomerEngagementService) {}

  @Get(':id/customer-access/engagement')
  summary(
    @Param('id', new ParseUUIDPipe()) quoteId: string,
    @Query('expectedRevisionNumber', ParseIntPipe) expectedRevisionNumber: number,
  ) {
    return this.engagement.engagementSummary(quoteId, expectedRevisionNumber);
  }
}

export const QUOTE_CUSTOMER_ENGAGEMENT_ROUTE_SECURITY = {
  rateLimitWindowMs: RATE_LIMIT_WINDOW_MS,
  challengeRateLimitMax: CHALLENGE_RATE_LIMIT_MAX,
  confirmRateLimitMax: CONFIRM_RATE_LIMIT_MAX,
  authorizationScheme: 'QuoteCapability',
} as const;
