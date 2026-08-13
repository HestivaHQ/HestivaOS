import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  ApprovedQuoteOperationalCostProvider,
  type AllocatedRouteDistanceResolver,
  UnavailableAllocatedRouteDistanceResolver,
} from './approved-quote-operational-cost-provider';
import { OpenRouteServiceAllocatedRouteDistanceResolver } from './google-routes-allocated-route-distance-resolver';
import { QUOTE_OPERATIONAL_COST_PROVIDER } from './quote-operational-cost-source';
import { WebsiteQuoteIngestionController } from './website-quote-ingestion.controller';
import { WebsiteQuoteIngestionService } from './website-quote-ingestion.service';

function configuredCoidaRate(): number | null {
  const raw = process.env.HESTIVA_COIDA_RATE;
  if (!raw) return null;

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function configuredRouteDistanceResolver(): AllocatedRouteDistanceResolver {
  const apiKey = process.env.OPENROUTESERVICE_API_KEY?.trim();
  const latitude = Number(process.env.HESTIVA_DEPLOYMENT_BASE_LATITUDE);
  const longitude = Number(process.env.HESTIVA_DEPLOYMENT_BASE_LONGITUDE);

  if (
    apiKey &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  ) {
    return new OpenRouteServiceAllocatedRouteDistanceResolver({
      apiKey,
      deploymentBaseLatitude: latitude,
      deploymentBaseLongitude: longitude,
    });
  }

  return new UnavailableAllocatedRouteDistanceResolver();
}

@Module({
  controllers: [WebsiteQuoteIngestionController],
  providers: [
    PrismaService,
    WebsiteQuoteIngestionService,
    {
      provide: QUOTE_OPERATIONAL_COST_PROVIDER,
      useFactory: () =>
        new ApprovedQuoteOperationalCostProvider({
          coidaRate: configuredCoidaRate(),
          routeDistanceResolver: configuredRouteDistanceResolver(),
        }),
    },
  ],
})
export class QuotesModule {}
