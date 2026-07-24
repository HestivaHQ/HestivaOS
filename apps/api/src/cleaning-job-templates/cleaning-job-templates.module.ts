import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CleaningJobTemplatesController } from './cleaning-job-templates.controller';
import { CleaningJobTemplatesService } from './cleaning-job-templates.service';

@Module({
  controllers: [CleaningJobTemplatesController],
  providers: [CleaningJobTemplatesService, PrismaService],
  exports: [CleaningJobTemplatesService],
})
export class CleaningJobTemplatesModule {}