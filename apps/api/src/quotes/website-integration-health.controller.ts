import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { Public } from '../users/public.decorator';
import {
  verifyWebsiteIntegrationAuthorization,
  websiteIntegrationSecretFingerprint,
} from './website-integration-auth';

@Controller('integrations/website/health')
export class WebsiteIntegrationHealthController {
  @Public()
  @Get()
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
}
