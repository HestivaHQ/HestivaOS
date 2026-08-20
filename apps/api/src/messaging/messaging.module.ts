import { Global, Module } from '@nestjs/common';
import { MessagingAdapterRegistry } from './messaging-adapter-registry';
import { MessagingAdminReplyController } from './messaging-admin-reply.controller';
import { MessagingAdminReplyService } from './messaging-admin-reply.service';
import { MessagingCustomerLinkingController } from './messaging-customer-linking.controller';
import { MessagingCustomerLinkingService } from './messaging-customer-linking.service';
import { MessagingService } from './messaging.service';
import { MessengerPlatformAdapter } from './messenger-platform.adapter';
import { MessengerWebhookController } from './messenger-webhook.controller';
import { WhatsAppCloudApiAdapter } from './whatsapp-cloud-api.adapter';
import { WhatsAppInboundMediaService } from './whatsapp-inbound-media.service';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';

@Global()
@Module({
  controllers: [WhatsAppWebhookController, MessengerWebhookController, MessagingCustomerLinkingController, MessagingAdminReplyController],
  providers: [MessagingAdapterRegistry, MessagingService, MessagingCustomerLinkingService, MessagingAdminReplyService, WhatsAppCloudApiAdapter, WhatsAppInboundMediaService, MessengerPlatformAdapter],
  exports: [MessagingAdapterRegistry, MessagingService, MessagingCustomerLinkingService, MessagingAdminReplyService],
})
export class MessagingModule {}
