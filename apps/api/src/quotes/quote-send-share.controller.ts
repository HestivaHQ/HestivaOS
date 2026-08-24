import { Body, Controller, Get, Param, ParseIntPipe, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from '../users/current-user.decorator';
import { Roles } from '../users/roles.decorator';
import { QuoteSendShareService } from './quote-send-share.service';

@Controller('quotes')
@Roles(UserRole.ADMIN)
export class QuoteSendShareController {
  constructor(private readonly sendShare: QuoteSendShareService) {}

  @Post(':id/send-share/email')
  sendEmail(
    @Param('id', new ParseUUIDPipe()) quoteId: string,
    @Body('expectedRevisionNumber', ParseIntPipe) expectedRevisionNumber: number,
    @CurrentUser() user: User,
  ) {
    return this.sendShare.sendEmail(quoteId, expectedRevisionNumber, user);
  }

  @Post(':id/send-share/email/reconcile')
  recoverEmail(
    @Param('id', new ParseUUIDPipe()) quoteId: string,
    @Body('expectedRevisionNumber', ParseIntPipe) expectedRevisionNumber: number,
    @CurrentUser() user: User,
  ) {
    return this.sendShare.recoverEmail(quoteId, expectedRevisionNumber, user);
  }

  @Post(':id/send-share/whatsapp-composer')
  openWhatsApp(
    @Param('id', new ParseUUIDPipe()) quoteId: string,
    @Body('expectedRevisionNumber', ParseIntPipe) expectedRevisionNumber: number,
    @CurrentUser() user: User,
  ) {
    return this.sendShare.openWhatsApp(quoteId, expectedRevisionNumber, user);
  }

  @Get(':id/send-share/tracking')
  tracking(
    @Param('id', new ParseUUIDPipe()) quoteId: string,
    @Query('expectedRevisionNumber', ParseIntPipe) expectedRevisionNumber: number,
  ) {
    return this.sendShare.tracking(quoteId, expectedRevisionNumber);
  }
}