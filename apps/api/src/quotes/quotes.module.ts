import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { WebsiteQuoteIngestionController } from './website-quote-ingestion.controller';
import { WebsiteQuoteIngestionService } from './website-quote-ingestion.service';

@Module({
  controllers: [WebsiteQuoteIngestionController],
  providers: [PrismaService, WebsiteQuoteIngestionService],
})
export class QuotesModule {}
