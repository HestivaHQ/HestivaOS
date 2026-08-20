import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CorrespondenceController } from './correspondence.controller';
import { CorrespondenceService } from './correspondence.service';

@Module({
  controllers: [CorrespondenceController],
  providers: [CorrespondenceService, PrismaService],
  exports: [CorrespondenceService],
})
export class CorrespondenceModule {}
