import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../users/roles.decorator';
import { MessagingAdminReplyService, type ManualMessengerReplyInput } from './messaging-admin-reply.service';

@Controller('messaging/conversations')
@Roles(UserRole.ADMIN)
export class MessagingAdminReplyController {
  constructor(private readonly replies: MessagingAdminReplyService) {}

  @Get()
  list() {
    return this.replies.listConversations();
  }

  @Post(':conversationId/manual-replies')
  reply(
    @Param('conversationId', new ParseUUIDPipe()) conversationId: string,
    @Body() input: ManualMessengerReplyInput,
  ) {
    return this.replies.reply(conversationId, input);
  }
}
