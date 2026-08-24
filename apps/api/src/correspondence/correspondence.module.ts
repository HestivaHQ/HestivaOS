import { Module } from '@nestjs/common';
import { CorrespondenceRecordsController } from './correspondence-records.controller';
import { CorrespondenceController } from './correspondence.controller';
import { CorrespondenceService } from './correspondence.service';
import { CorrespondenceWorkOrderEventsService } from './correspondence-work-order-events.service';
import { CorrespondenceSenderResolver, ResendEmailTransport } from './resend-email.transport';
import { ResendWebhookController } from './resend-webhook.controller';
import { ResendWebhookService } from './resend-webhook.service';

@Module({
  controllers: [CorrespondenceController, CorrespondenceRecordsController, ResendWebhookController],
  providers: [CorrespondenceService, CorrespondenceWorkOrderEventsService, CorrespondenceSenderResolver, ResendEmailTransport, ResendWebhookService],
  exports: [CorrespondenceService, CorrespondenceWorkOrderEventsService, CorrespondenceSenderResolver, ResendEmailTransport],
})
export class CorrespondenceModule {}
