import { Controller, Get, Headers, HttpCode, Post, Query, RawBodyRequest, Req, Res, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { Public } from '../users/public.decorator';
import { MessagingCustomerLinkingService } from './messaging-customer-linking.service';
import { MessagingService } from './messaging.service';
import { MessengerPlatformAdapter } from './messenger-platform.adapter';

type WebhookRequest = { body: unknown };
type WebhookResponse = { status(code: number): WebhookResponse; type(contentType: string): WebhookResponse; send(body: string): unknown };

@Public()
@Controller('messaging/webhooks/messenger')
export class MessengerWebhookController {
  constructor(
    private readonly adapter: MessengerPlatformAdapter,
    private readonly messaging: MessagingService,
    private readonly customerLinking: MessagingCustomerLinkingService,
  ) {}

  @Get()
  verify(
    @Query('hub.mode') mode: string | undefined,
    @Query('hub.verify_token') token: string | undefined,
    @Query('hub.challenge') challenge: string | undefined,
    @Res() response: WebhookResponse,
  ) {
    if (!challenge || !this.adapter.verifySubscription(mode, token)) throw new UnauthorizedException('Messenger webhook verification failed.');
    return response.status(200).type('text/plain').send(challenge);
  }

  @Post()
  @HttpCode(200)
  async receive(
    @Req() request: RawBodyRequest<WebhookRequest>,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    if (!request.rawBody) throw new ServiceUnavailableException('Raw webhook body is unavailable for signature verification.');
    const context = { receivedAt: new Date().toISOString(), headers, rawBody: request.rawBody };
    const events = await this.adapter.normalizeInboundWebhook(request.body, context);
    for (const event of events) {
      const message = await this.messaging.persistInbound(event);
      await this.customerLinking.resolveAndLinkTrustedIdentity(message.conversationId);
    }
    return { received: true, normalizedEvents: events.length };
  }
}
