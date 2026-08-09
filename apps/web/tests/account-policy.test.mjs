import assert from 'node:assert/strict';
import test from 'node:test';
import { accountInitials, canAccessAdminSettings, canSeeAdminSettings } from '../lib/account-policy.js';

const user = (role) => ({ role, firstName: 'Ada', lastName: 'Lovelace', displayName: null });

test('builds initials from the personal name fallback', () => assert.equal(accountInitials(user('TECHNICIAN'), 'ada@example.test'), 'AL'));
test('shows Admin Settings only to ADMIN', () => {
  assert.equal(canSeeAdminSettings(user('ADMIN')), true);
  for (const role of ['TECHNICIAN', 'SUPERVISOR', 'OPERATIONS_MANAGER', 'DISPATCHER']) {
    assert.equal(canAccessAdminSettings(role), false);
    assert.equal(canSeeAdminSettings(user(role)), false);
  }
});
