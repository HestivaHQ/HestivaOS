import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const crews = readFileSync(new URL('../app/crews/crews-manager.tsx', import.meta.url), 'utf8');
const orders = readFileSync(new URL('../app/work-orders/work-orders-manager.tsx', import.meta.url), 'utf8');
const detail = readFileSync(new URL('../app/work-orders/[id]/page.tsx', import.meta.url), 'utf8');

test('Crew UI is a simple leadership and membership editor', () => {
  assert.match(crews, /Leader:[\s\S]*Technician/);
  assert.match(crews, /memberIds\.length === 1/);
  assert.doesNotMatch(crews, /payroll|attendance|leave|route optimisation|performance metrics/i);
});
test('Work Order UI prepopulates and displays Job Leader', () => {
  assert.match(orders, /crew\?\.leaderId[\s\S]*Job Leader/);
  assert.match(orders, /jobLeaderId/);
  assert.match(detail, /Job Leader/);
});
