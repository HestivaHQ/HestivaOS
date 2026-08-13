import { Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { Public } from '../users/public.decorator';
import { verifyWebsiteIntegrationAuthorization } from './website-integration-auth';
import { WebsiteQuoteIngestionService } from './website-quote-ingestion.service';

@Controller('integrations/website/quotes')
export class WebsiteQuoteIngestionController {
  constructor(private readonly ingestion: WebsiteQuoteIngestionService) {}

  @Public()
  @Post()
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
