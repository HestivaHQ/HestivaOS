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
import { Public } from '../users/public.decorator';
import { MessagingCustomerLinkingService } from './messaging-customer-linking.service';
import { MessagingQuoteLiveOrchestratorService } from './messaging-quote-live-orchestrator.service';
import { MessagingConversationControlService } from './messaging-conversation-control.service';
import { MessagingService } from './messaging.service';
import { WhatsAppCloudApiAdapter } from './whatsapp-cloud-api.adapter';
import { WhatsAppInboundMediaService } from './whatsapp-inbound-media.service';
import { WhatsAppQuoteFlowInboundService } from './whatsapp-quote-flow-inbound.service';

type WebhookRequest = { body: unknown };
type WebhookResponse = {
  status(code: number): WebhookResponse;
  type(contentType: string): WebhookResponse;
  send(body: string): unknown;
};

@Public()
@Controller('messaging/webhooks/whatsapp')
export class WhatsAppWebhookController {
  constructor(
    private readonly adapter: WhatsAppCloudApiAdapter,
    private readonly messaging: MessagingService,
    private readonly inboundMedia: WhatsAppInboundMediaService,
    private readonly customerLinking: MessagingCustomerLinkingService,
    private readonly quoteOrchestrator: MessagingQuoteLiveOrchestratorService,
    private readonly quoteFlowInbound: WhatsAppQuoteFlowInboundService,
    private readonly conversationControl: MessagingConversationControlService,
  ) {}

  @Get()
  verify(
    @Query('hub.mode') mode: string | undefined,
    @Query('hub.verify_token') token: string | undefined,
    @Query('hub.challenge') challenge: string | undefined,
    @Res() response: WebhookResponse,
  ) {
    if (!challenge || !this.adapter.verifySubscription(mode, token)) {
      throw new UnauthorizedException('WhatsApp webhook verification failed.');
    }
    return response.status(200).type('text/plain').send(challenge);
  }

  @Post()
  @HttpCode(200)
  async receive(
    @Req() request: RawBodyRequest<WebhookRequest>,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    if (!request.rawBody) {
      throw new ServiceUnavailableException('Raw webhook body is unavailable for signature verification.');
    }
    const context = { receivedAt: new Date().toISOString(), headers, rawBody: request.rawBody };
    const events = await this.adapter.normalizeInboundWebhook(request.body, context);
    const statusEvents = await this.adapter.normalizeStatusWebhook(request.body, context);
    for (const event of events) {
      const message = await this.messaging.persistInbound(event);
      await this.customerLinking.resolveAndLinkTrustedIdentity(message.conversationId);
      await this.inboundMedia.secureInboundMedia(message.id, event);
      if (await this.conversationControl.automationEnabled(message.conversationId)) {
        const flowOwned = await this.quoteFlowInbound.handleInbound(message.id);
        if (!flowOwned) await this.quoteOrchestrator.handleInbound(message.id);
      }
    }
    for (const event of statusEvents) {
      const message = await this.messaging.persistWhatsAppStatus(event);
      if (message) await this.quoteFlowInbound.reconcileLaunchStatus(message.id, event.providerStatus);
    }
    return { received: true, normalizedEvents: events.length, normalizedStatusEvents: statusEvents.length };
  }
}
