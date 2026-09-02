import { describe, expect, it, jest } from '@jest/globals';
import { UsersController } from './users.controller';

function createController() {
  const users = {
    sync: jest.fn(),
  };
  const supabaseAdmin = {};
  return {
    controller: new UsersController(users as never, supabaseAdmin as never),
    users,
  };
}

const currentUser = {
  id: 'user-1',
  authUserId: 'auth-1',
  email: 'person@example.com',
  firstName: 'Person',
  lastName: 'One',
  displayName: 'Person One',
  phoneNumber: null,
  profilePhotoUrl: null,
  role: 'ADMIN',
  status: 'ACTIVE',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('UsersController login synchronization', () => {
  it('reuses the guard-resolved active user when Auth UUID and normalized email still match', async () => {
    const { controller, users } = createController();

    await expect(controller.sync({
      supabaseUser: { id: 'auth-1', email: ' Person@Example.com ' },
      currentUser: currentUser as never,
    })).resolves.toEqual(currentUser);

    expect(users.sync).not.toHaveBeenCalled();
  });

  it('delegates to full reconciliation when the authenticated email changed', async () => {
    const { controller, users } = createController();
    const reconciled = { ...currentUser, email: 'new@example.com' };
    users.sync.mockResolvedValue(reconciled as never);

    await expect(controller.sync({
      supabaseUser: { id: 'auth-1', email: 'new@example.com', email_confirmed_at: '2026-09-02T00:00:00Z' },
      currentUser: currentUser as never,
    })).resolves.toEqual(reconciled);

    expect(users.sync).toHaveBeenCalledWith({
      id: 'auth-1',
      email: 'new@example.com',
      email_confirmed_at: '2026-09-02T00:00:00Z',
    });
  });

  it('delegates to full reconciliation when the guard has no application user', async () => {
    const { controller, users } = createController();
    const created = { ...currentUser, id: 'user-new', authUserId: 'auth-new' };
    users.sync.mockResolvedValue(created as never);

    await expect(controller.sync({
      supabaseUser: { id: 'auth-new', email: 'new@example.com' },
    })).resolves.toEqual(created);

    expect(users.sync).toHaveBeenCalledWith({ id: 'auth-new', email: 'new@example.com' });
  });
});
