import { Global, Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MessagingAdapterRegistry } from './messaging-adapter-registry';
import { MessagingService } from './messaging.service';
import { MessengerPlatformAdapter } from './messenger-platform.adapter';
import { MessengerWebhookController } from './messenger-webhook.controller';
import { WhatsAppCloudApiAdapter } from './whatsapp-cloud-api.adapter';
import { WhatsAppInboundMediaService } from './whatsapp-inbound-media.service';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';

@Global()
@Module({
  controllers: [WhatsAppWebhookController, MessengerWebhookController],
  providers: [PrismaService, MessagingAdapterRegistry, MessagingService, WhatsAppCloudApiAdapter, WhatsAppInboundMediaService, MessengerPlatformAdapter],
  exports: [MessagingAdapterRegistry, MessagingService],
})
export class MessagingModule {}
