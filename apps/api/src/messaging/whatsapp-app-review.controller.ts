import { Body, Controller, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../users/roles.decorator';
import { WhatsAppAppReviewService } from './whatsapp-app-review.service';

@Controller('messaging/app-review/whatsapp')
@Roles(UserRole.ADMIN)
export class WhatsAppAppReviewController {
  constructor(private readonly appReview: WhatsAppAppReviewService) {}

  @Post('test-template')
  sendTestTemplate(@Body() input: { to?: string }) {
    return this.appReview.sendTestTemplate(input.to ?? '');
  }

  @Post('test-management')
  runManagementTest() {
    return this.appReview.runManagementTest();
  }
}
