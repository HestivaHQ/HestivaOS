import { BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../users/roles.decorator';
import { MessagingCustomerLinkingService } from './messaging-customer-linking.service';

@Controller('messaging/conversations')
@Roles(UserRole.ADMIN)
export class MessagingCustomerLinkingController {
  constructor(private readonly linking: MessagingCustomerLinkingService) {}

  @Get(':conversationId/customer-link')
  get(
    @Param('conversationId', new ParseUUIDPipe()) conversationId: string,
  ) {
    return this.linking.get(conversationId);
  }

  @Put(':conversationId/customer-link')
  link(
    @Param('conversationId', new ParseUUIDPipe()) conversationId: string,
    @Body() input: { customerId?: string },
  ) {
    if (!input.customerId) throw new BadRequestException('customerId is required.');
    return this.linking.link(conversationId, input.customerId);
  }
}
