import { Body, Controller, Get, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { Public } from '../users/public.decorator';
import {
  verifyWebsiteIntegrationAuthorization,
  websiteIntegrationSecretFingerprint,
} from './website-integration-auth';
import { WebsiteQuoteIngestionService } from './website-quote-ingestion.service';

@Controller('integrations/website')
export class WebsiteQuoteIngestionController {
  constructor(private readonly ingestion: WebsiteQuoteIngestionService) {}

  @Public()
  @Get('health')
  health(@Headers('authorization') authorization: string | undefined) {
    if (!verifyWebsiteIntegrationAuthorization(authorization)) {
      throw new UnauthorizedException('Invalid website integration credentials.');
    }

    return {
      ok: true as const,
      integration: 'website',
      secretFingerprint: websiteIntegrationSecretFingerprint(),
    };
  }

  @Public()
  @Post('quotes')
  async ingest(
    @Headers('authorization') authorization: string | undefined,
    @Body() payload: unknown,
  ) {
    if (!verifyWebsiteIntegrationAuthorization(authorization)) {
      throw new UnauthorizedException('Invalid website integration credentials.');
    }
    return this.ingestion.ingest(payload);
  }
}
