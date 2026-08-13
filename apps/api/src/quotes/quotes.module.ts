import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  ApprovedQuoteOperationalCostProvider,
  UnavailableAllocatedRouteDistanceResolver,
} from './approved-quote-operational-cost-provider';
import { QUOTE_OPERATIONAL_COST_PROVIDER } from './quote-operational-cost-source';
import { WebsiteQuoteIngestionController } from './website-quote-ingestion.controller';
import { WebsiteQuoteIngestionService } from './website-quote-ingestion.service';

function configuredCoidaRate(): number | null {
  const raw = process.env.HESTIVA_COIDA_RATE;
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

@Module({
  controllers: [WebsiteQuoteIngestionController],
  providers: [
    PrismaService,
    WebsiteQuoteIngestionService,
    {
      provide: QUOTE_OPERATIONAL_COST_PROVIDER,
      useFactory: () => new ApprovedQuoteOperationalCostProvider({
        coidaRate: configuredCoidaRate(),
        // Actual road distance is an approved requirement. Keep ingestion fail-closed
        // until a routing-backed allocated-route resolver is connected.
        routeDistanceResolver: new UnavailableAllocatedRouteDistanceResolver(),
      }),
    },
  ],
})
export class QuotesModule {}
