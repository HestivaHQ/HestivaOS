import { Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { verifyWebsiteIntegrationAuthorization } from '../quotes/website-integration-auth';
import { Public } from '../users/public.decorator';
import { WebsiteEnquiryIngestionService } from './website-enquiry-ingestion.service';

@Controller('integrations/website/enquiries')
export class WebsiteEnquiryIngestionController {
  constructor(private readonly ingestion: WebsiteEnquiryIngestionService) {}

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
