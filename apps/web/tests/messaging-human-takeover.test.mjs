import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const manager = readFileSync(new URL('../app/admin/messaging/messaging-manager.tsx', import.meta.url), 'utf8');
const api = readFileSync(new URL('../lib/messaging-api.ts', import.meta.url), 'utf8');

test('existing admin messaging surface exposes authoritative human takeover controls', () => {
  assert.match(manager, /Human handling — automation paused/);
  assert.match(manager, /'Take over'/);
  assert.match(manager, /Return to automation/);
  assert.match(manager, /await refresh\(\)/);
  assert.match(api, /\/takeover/);
  assert.match(api, /\/return-to-automation/);
  assert.match(api, /expectedVersion/);
});

test('takeover UI preserves Messenger reply eligibility instead of bypassing provider policy', () => {
  assert.match(manager, /disabled=\{!row\.replyEligible/);
  assert.match(manager, /The 24-hour reply window is closed\./);
  assert.doesNotMatch(manager, /message[_ -]?tag/i);
});
