import { Controller, Headers, Post, Req } from '@nestjs/common';
import { Public } from '../users/public.decorator';
import { ResendWebhookService } from './resend-webhook.service';

type RawRequest = { rawBody?: Buffer };

@Controller('correspondence/webhooks/resend')
export class ResendWebhookController {
  constructor(private readonly webhooks: ResendWebhookService) {}

  @Public()
  @Post()
  receive(
    @Req() request: RawRequest,
    @Headers('svix-id') id: string | undefined,
    @Headers('svix-timestamp') timestamp: string | undefined,
    @Headers('svix-signature') signature: string | undefined,
  ) {
    return this.webhooks.ingest(request.rawBody ?? Buffer.alloc(0), {
      id: id ?? '',
      timestamp: timestamp ?? '',
      signature: signature ?? '',
    });
  }
}
