import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { QUOTE_OPERATIONAL_COST_PROVIDER } from './quote-operational-cost-source';
import { WebsiteQuoteIngestionController } from './website-quote-ingestion.controller';
import { WebsiteQuoteIngestionService } from './website-quote-ingestion.service';

@Module({
  controllers: [WebsiteQuoteIngestionController],
  providers: [
    PrismaService,
    WebsiteQuoteIngestionService,
    {
      provide: QUOTE_OPERATIONAL_COST_PROVIDER,
      useValue: {
        resolve: async () => null,
      },
    },
  ],
})
export class QuotesModule {}
