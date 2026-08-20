import { Module } from '@nestjs/common';
import { CleaningJobTemplatesController } from './cleaning-job-templates.controller';
import { CleaningJobTemplatesService } from './cleaning-job-templates.service';

@Module({
  controllers: [CleaningJobTemplatesController],
  providers: [CleaningJobTemplatesService],
  exports: [CleaningJobTemplatesService],
})
export class CleaningJobTemplatesModule {}