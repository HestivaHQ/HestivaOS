import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Work Order reference selectors use debounced server search instead of fixed 100-record snapshots', () => {
  const source = read('app/work-orders/work-orders-manager.tsx');
  assert.match(source, /Search customers/);
  assert.match(source, /Search properties/);
  assert.match(source, /Search crews/);
  assert.match(source, /Search eligible technicians/);
  assert.match(source, /Search primary services/);
  assert.match(source, /Search add-ons/);
  assert.match(source, /pageSize=20/);
  assert.match(source, /window\.setTimeout/);
  assert.match(source, /api\.customers\(`\?page=1&pageSize=20/);
  assert.match(source, /api\.properties\(`\?page=1&pageSize=20&customerId=/);
  assert.match(source, /api\.technicians\(`\?page=1&pageSize=20&status=ACTIVE/);
  assert.match(source, /api\.crews\(`\?page=1&pageSize=20&status=ACTIVE/);
  assert.match(source, /api\.services\(`\?page=1&pageSize=20&status=ACTIVE&type=PRIMARY/);
  assert.match(source, /api\.services\(`\?page=1&pageSize=20&status=ACTIVE&type=ADD_ON/);
  assert.doesNotMatch(source, /api\.customers\('\?page=1&pageSize=100'\)/);
  assert.doesNotMatch(source, /api\.properties\('\?page=1&pageSize=100'\)/);
  assert.doesNotMatch(source, /api\.crews\('\?page=1&pageSize=100'\)/);
});

test('editing preserves selected historical canonical records while searches refresh', () => {
  const source = read('app/work-orders/work-orders-manager.tsx');
  assert.match(source, /mergeSelected\(current, workOrder\.customer\)/);
  assert.match(source, /mergeSelected\(current, workOrder\.property\)/);
  assert.match(source, /mergeSelectedMany\(current, workOrder\.assignedTechnicians/);
  assert.match(source, /mergeSelected\(current, workOrder\.crew\)/);
  assert.match(source, /mergeSelected\(current, workOrder\.service\)/);
});
