import { Global, Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MessagingAdapterRegistry } from './messaging-adapter-registry';
import { MessagingService } from './messaging.service';
import { WhatsAppCloudApiAdapter } from './whatsapp-cloud-api.adapter';
import { WhatsAppInboundMediaService } from './whatsapp-inbound-media.service';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';

@Global()
@Module({
  controllers: [WhatsAppWebhookController],
  providers: [PrismaService, MessagingAdapterRegistry, MessagingService, WhatsAppCloudApiAdapter, WhatsAppInboundMediaService],
  exports: [MessagingAdapterRegistry, MessagingService],
})
export class MessagingModule {}
