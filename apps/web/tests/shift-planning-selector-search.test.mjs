import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manager = readFileSync(new URL('../app/shifts/shifts-manager.tsx', import.meta.url), 'utf8');

test('Shift Planning uses bounded debounced server-backed selector search', () => {
  assert.match(manager, /const \[crewSearch, setCrewSearch\]/);
  assert.match(manager, /const \[technicianSearch, setTechnicianSearch\]/);
  assert.match(manager, /const \[workOrderSearch, setWorkOrderSearch\]/);
  assert.match(manager, /pageSize=20&status=ACTIVE/);
  assert.match(manager, /api\.crews\(`\?page=1&pageSize=20&status=ACTIVE/);
  assert.match(manager, /api\.technicians\(`\?page=1&pageSize=20&status=ACTIVE/);
  assert.match(manager, /api\.workOrders\(`\?page=1&pageSize=20/);
  assert.match(manager, /window\.setTimeout\(\(\) => \{/);
  assert.match(manager, /}, 300\)/);
  assert.doesNotMatch(manager, /api\.crews\('\?page=1&pageSize=100'\)/);
  assert.doesNotMatch(manager, /api\.technicians\('\?page=1&pageSize=100'\)/);
  assert.doesNotMatch(manager, /api\.workOrders\('\?page=1&pageSize=100'\)/);
});

test('Shift Planning preserves selected historical relationships while searches refresh', () => {
  assert.match(manager, /function mergeSelected/);
  assert.match(manager, /mergeSelected\(data\.items, current\.find\(\(crew\) => crew\.id === form\.crewId\)\)/);
  assert.match(manager, /mergeSelected\(data\.items, current\.find\(\(technician\) => technician\.id === form\.technicianId\)\)/);
  assert.match(manager, /mergeSelected\(data\.items, current\.find\(\(workOrder\) => workOrder\.id === form\.workOrderId\)\)/);
  assert.match(manager, /setCrews\(\(current\) => mergeSelected\(current, shift\.crew\)\)/);
  assert.match(manager, /setTechnicians\(\(current\) => mergeSelected\(current, shift\.technician\)\)/);
  assert.match(manager, /setWorkOrders\(\(current\) => mergeSelected\(current, shift\.workOrder\)\)/);
  assert.match(manager, /inactive, historical/);
});
