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

test('Shift Planning starts its deterministic range on the authenticated server without a mount reload', () => {
  const page = readFileSync(new URL('../app/(authenticated)/shifts/page.tsx', import.meta.url), 'utf8');
  const range = readFileSync(new URL('../lib/shift-date-range.ts', import.meta.url), 'utf8');
  assert.match(page, /const initialRange = defaultShiftDateRange\(\)/);
  assert.match(page, /authenticatedApi\.shifts\(shiftRangeQuery\(initialRange\)\)/);
  assert.match(page, /initialItems=\{shifts\.items\}/);
  assert.match(manager, /useState<Shift\[]>\(initialItems\)/);
  assert.match(manager, /if \(initialListLoad\.current\)/);
  assert.match(manager, /useState\(initialRange\.dateFrom\)/);
  assert.match(manager, /useState\(initialRange\.dateTo\)/);
  assert.match(range, /timeZone: 'Africa\/Johannesburg'/);
  assert.match(range, /getUTCDay\(\)/);
  assert.match(range, /Date\.UTC/);
});

test('Shift selector requests are editor-only while range changes still refresh immediately', () => {
  assert.match(manager, /const \[editorOpen, setEditorOpen\] = useState\(false\)/);
  assert.ok((manager.match(/if \(!editorOpen\) return;/g) ?? []).length >= 2);
  assert.match(manager, /if \(!editorOpen \|\| selectedCrew\) return;/);
  assert.match(manager, /onClick=\{\(\) => setEditorOpen\(true\)\}>Create shift/);
  assert.match(manager, /function edit\(shift: Shift\) \{\n    setEditorOpen\(true\)/);
  assert.match(manager, /void loadShifts\(\);\n  \}, \[dateFrom, dateTo\]\)/);
});
