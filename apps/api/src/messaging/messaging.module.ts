import { Global, Module } from '@nestjs/common';
import { QuotesModule } from '../quotes/quotes.module';
import { MessagingAdapterRegistry } from './messaging-adapter-registry';
import { MessagingAdminReplyController } from './messaging-admin-reply.controller';
import { MessagingAdminReplyService } from './messaging-admin-reply.service';
import { MessagingCustomerLinkingController } from './messaging-customer-linking.controller';
import { MessagingCustomerLinkingService } from './messaging-customer-linking.service';
import { MessagingQuoteLiveOrchestratorService } from './messaging-quote-live-orchestrator.service';
import { MessagingQuoteStateService } from './messaging-quote-state.service';
import { MessagingQuoteSubmissionService } from './messaging-quote-submission.service';
import { MessagingService } from './messaging.service';
import { MessengerPlatformAdapter } from './messenger-platform.adapter';
import { MessengerWebhookController } from './messenger-webhook.controller';
import { WhatsAppCloudApiAdapter } from './whatsapp-cloud-api.adapter';
import { WhatsAppInboundMediaService } from './whatsapp-inbound-media.service';
import { WhatsAppQuoteFlowInboundService } from './whatsapp-quote-flow-inbound.service';
import { WhatsAppQuoteFlowSessionService } from './whatsapp-quote-flow-session.service';
import { WhatsAppQuoteFlowSubmissionService } from './whatsapp-quote-flow-submission.service';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';

@Global()
@Module({
  imports: [QuotesModule],
  controllers: [WhatsAppWebhookController, MessengerWebhookController, MessagingCustomerLinkingController, MessagingAdminReplyController],
  providers: [MessagingAdapterRegistry, MessagingService, MessagingCustomerLinkingService, MessagingAdminReplyService, MessagingQuoteStateService, MessagingQuoteSubmissionService, MessagingQuoteLiveOrchestratorService, WhatsAppCloudApiAdapter, WhatsAppInboundMediaService, WhatsAppQuoteFlowSessionService, WhatsAppQuoteFlowSubmissionService, WhatsAppQuoteFlowInboundService, MessengerPlatformAdapter],
  exports: [MessagingAdapterRegistry, MessagingService, MessagingCustomerLinkingService, MessagingAdminReplyService, MessagingQuoteStateService, MessagingQuoteSubmissionService, MessagingQuoteLiveOrchestratorService, WhatsAppQuoteFlowSessionService],
})
export class MessagingModule {}
