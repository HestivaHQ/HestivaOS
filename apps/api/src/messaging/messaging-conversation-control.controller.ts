import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from '../users/current-user.decorator';
import { Roles } from '../users/roles.decorator';
import { ConversationControlInput, MessagingConversationControlService } from './messaging-conversation-control.service';

@Controller('messaging/conversations')
@Roles(UserRole.ADMIN)
export class MessagingConversationControlController {
  constructor(private readonly control: MessagingConversationControlService) {}

  @Post(':conversationId/takeover')
  takeOver(@CurrentUser() actor: User, @Param('conversationId', new ParseUUIDPipe()) conversationId: string, @Body() input: ConversationControlInput) {
    return this.control.takeOver(conversationId, actor.id, input);
  }

  @Post(':conversationId/return-to-automation')
  returnToAutomation(@CurrentUser() actor: User, @Param('conversationId', new ParseUUIDPipe()) conversationId: string, @Body() input: ConversationControlInput) {
    return this.control.returnToAutomation(conversationId, actor.id, input);
  }
}
