import { Body, Controller, Get, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../users/roles.decorator';
import { WhatsAppBusinessService } from './whatsapp-business.service';

@Controller('messaging/whatsapp-business')
@Roles(UserRole.ADMIN)
export class WhatsAppBusinessController {
  constructor(private readonly whatsappBusiness: WhatsAppBusinessService) {}

  @Get('templates')
  listTemplates() {
    return this.whatsappBusiness.listTemplates();
  }

  @Post('template-messages')
  sendTemplateMessage(@Body() input: { to?: unknown; templateName?: unknown; languageCode?: unknown; bodyParameters?: unknown }) {
    return this.whatsappBusiness.sendTemplateMessage(input);
  }
}
