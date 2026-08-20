import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CorrespondenceRecordsController } from './correspondence-records.controller';
import { CorrespondenceController } from './correspondence.controller';
import { CorrespondenceService } from './correspondence.service';

@Module({
  controllers: [CorrespondenceController, CorrespondenceRecordsController],
  providers: [CorrespondenceService, PrismaService],
  exports: [CorrespondenceService],
})
export class CorrespondenceModule {}
