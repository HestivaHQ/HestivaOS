import { Module } from '@nestjs/common';
import { CorrespondenceModule } from '../correspondence/correspondence.module';
import {
  ApprovedQuoteOperationalCostProvider,
  type AllocatedRouteDistanceResolver,
  UnavailableAllocatedRouteDistanceResolver,
} from './approved-quote-operational-cost-provider';
import { OpenRouteServiceAllocatedRouteDistanceResolver } from './openrouteservice-allocated-route-distance-resolver';
import { QUOTE_OPERATIONAL_COST_PROVIDER } from './quote-operational-cost-source';
import { QuotePricingReviewService } from './quote-pricing-review.service';
import { QuoteSubmissionService } from './quote-submission.service';
import { WebsiteIntegrationHealthController } from './website-integration-health.controller';
import { WebsiteQuoteIngestionController } from './website-quote-ingestion.controller';
import { WebsiteQuoteIngestionService } from './website-quote-ingestion.service';
import { QuoteReviewController } from './quote-review.controller';
import { QuoteReviewService } from './quote-review.service';
import { QuoteCustomerAccessAdminController, QuoteCustomerAccessPublicController } from './quote-customer-access.controller';
import { QuoteCustomerAccessService } from './quote-customer-access.service';
import { QuoteCustomerEngagementAdminController, QuoteCustomerEngagementPublicController } from './quote-customer-engagement.controller';
import { QuoteCustomerEngagementService } from './quote-customer-engagement.service';
import { QuoteCustomerResponseAdminController, QuoteCustomerResponsePublicController } from './quote-customer-response.controller';
import { QuoteCustomerResponseService } from './quote-customer-response.service';
import { QuoteSendShareController } from './quote-send-share.controller';
import { QuoteSendShareService } from './quote-send-share.service';

function configuredCoidaRate(): number | null {
  const raw = process.env.HESTIVA_COIDA_RATE;
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function configuredCoordinate(raw: string | undefined, min: number, max: number): number | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function configuredRouteDistanceResolver(): AllocatedRouteDistanceResolver {
  const apiKey = process.env.OPENROUTESERVICE_API_KEY?.trim();
  const latitude = configuredCoordinate(process.env.HESTIVA_DEPLOYMENT_BASE_LATITUDE, -90, 90);
  const longitude = configuredCoordinate(process.env.HESTIVA_DEPLOYMENT_BASE_LONGITUDE, -180, 180);
  if (apiKey && latitude !== null && longitude !== null) return new OpenRouteServiceAllocatedRouteDistanceResolver({ apiKey, deploymentBaseLatitude: latitude, deploymentBaseLongitude: longitude });
  return new UnavailableAllocatedRouteDistanceResolver();
}

@Module({
  imports: [CorrespondenceModule],
  controllers: [
    QuoteReviewController,
    QuoteCustomerAccessAdminController,
    QuoteCustomerAccessPublicController,
    QuoteCustomerEngagementAdminController,
    QuoteCustomerEngagementPublicController,
    QuoteCustomerResponseAdminController,
    QuoteCustomerResponsePublicController,
    QuoteSendShareController,
    WebsiteIntegrationHealthController,
    WebsiteQuoteIngestionController,
  ],
  providers: [
    WebsiteQuoteIngestionService,
    QuoteReviewService,
    QuotePricingReviewService,
    QuoteSubmissionService,
    QuoteCustomerAccessService,
    QuoteCustomerEngagementService,
    QuoteCustomerResponseService,
    QuoteSendShareService,
    { provide: QUOTE_OPERATIONAL_COST_PROVIDER, useFactory: () => new ApprovedQuoteOperationalCostProvider({ coidaRate: configuredCoidaRate(), routeDistanceResolver: configuredRouteDistanceResolver() }) },
  ],
  exports: [QuoteSubmissionService, QuoteCustomerAccessService],
})
export class QuotesModule {}
