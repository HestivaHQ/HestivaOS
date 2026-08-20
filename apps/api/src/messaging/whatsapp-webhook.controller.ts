import {
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  RawBodyRequest,
  Req,
  Res,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../users/public.decorator';
import { MessagingService } from './messaging.service';
import { WhatsAppCloudApiAdapter } from './whatsapp-cloud-api.adapter';

@Public()
@Controller('messaging/webhooks/whatsapp')
export class WhatsAppWebhookController {
  constructor(
    private readonly adapter: WhatsAppCloudApiAdapter,
    private readonly messaging: MessagingService,
  ) {}

  @Get()
  verify(
    @Query('hub.mode') mode: string | undefined,
    @Query('hub.verify_token') token: string | undefined,
    @Query('hub.challenge') challenge: string | undefined,
    @Res() response: Response,
  ) {
    if (!challenge || !this.adapter.verifySubscription(mode, token)) {
      throw new UnauthorizedException('WhatsApp webhook verification failed.');
    }
    return response.status(200).type('text/plain').send(challenge);
  }

  @Post()
  @HttpCode(200)
  async receive(
    @Req() request: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    if (!request.rawBody) {
      throw new ServiceUnavailableException('Raw webhook body is unavailable for signature verification.');
    }
    const receivedAt = new Date().toISOString();
    const events = await this.adapter.normalizeInboundWebhook(request.body, {
      receivedAt,
      headers,
      rawBody: request.rawBody,
    });
    for (const event of events) await this.messaging.persistInbound(event);
    return { received: true, normalizedEvents: events.length };
  }
}
