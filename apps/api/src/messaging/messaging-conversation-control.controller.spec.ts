import { UserRole } from '@prisma/client';
import { describe, expect, it } from '@jest/globals';
import { ROLES_KEY } from '../users/roles.decorator';
import { MessagingConversationControlController } from './messaging-conversation-control.controller';

describe('MessagingConversationControlController authorization', () => {
  it('allows ADMIN and excludes every non-admin application role', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, MessagingConversationControlController);
    expect(roles).toEqual([UserRole.ADMIN]);
    expect(roles).not.toEqual(expect.arrayContaining([
      UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.OPERATIONS_MANAGER, UserRole.DISPATCHER,
    ]));
  });
});
