import { Body, Controller, Get, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from '../users/current-user.decorator';
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
    @Body('customerId', new ParseUUIDPipe()) customerId: string,
  ) {
    return this.linking.link(conversationId, customerId);
  }

  @Put(':conversationId/trusted-identity')
  trustIdentity(
    @CurrentUser() actor: User,
    @Param('conversationId', new ParseUUIDPipe()) conversationId: string,
    @Body('contactId', new ParseUUIDPipe()) contactId: string,
  ) {
    return this.linking.trustConversationIdentity(conversationId, contactId, actor.id);
  }
}
