import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CorrespondenceRecordsController } from './correspondence-records.controller';
import { CorrespondenceController } from './correspondence.controller';
import { CorrespondenceService } from './correspondence.service';
import { CorrespondenceWorkOrderEventsService } from './correspondence-work-order-events.service';

@Module({
  controllers: [CorrespondenceController, CorrespondenceRecordsController],
  providers: [CorrespondenceService, CorrespondenceWorkOrderEventsService, PrismaService],
  exports: [CorrespondenceService, CorrespondenceWorkOrderEventsService],
})
export class CorrespondenceModule {}
