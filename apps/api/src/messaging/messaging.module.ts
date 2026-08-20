import { Global, Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MessagingAdapterRegistry } from './messaging-adapter-registry';
import { MessagingService } from './messaging.service';
import { WhatsAppCloudApiAdapter } from './whatsapp-cloud-api.adapter';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';

@Global()
@Module({
  controllers: [WhatsAppWebhookController],
  providers: [PrismaService, MessagingAdapterRegistry, MessagingService, WhatsAppCloudApiAdapter],
  exports: [MessagingAdapterRegistry, MessagingService],
})
export class MessagingModule {}
