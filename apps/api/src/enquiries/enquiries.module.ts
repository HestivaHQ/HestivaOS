import { Module } from '@nestjs/common';
import { WebsiteEnquiryIngestionController } from './website-enquiry-ingestion.controller';
import { WebsiteEnquiryIngestionService } from './website-enquiry-ingestion.service';

@Module({
  controllers: [WebsiteEnquiryIngestionController],
  providers: [WebsiteEnquiryIngestionService],
})
export class EnquiriesModule {}
