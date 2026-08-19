import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { WebsiteEnquiryIngestionController } from './website-enquiry-ingestion.controller';
import { WebsiteEnquiryIngestionService } from './website-enquiry-ingestion.service';

@Module({
  controllers: [WebsiteEnquiryIngestionController],
  providers: [PrismaService, WebsiteEnquiryIngestionService],
})
export class EnquiriesModule {}
