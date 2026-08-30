import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Work Orders preserves full initial data while streaming a route fallback', async () => {
  const page = await read('app/(authenticated)/work-orders/page.tsx');
  assert.match(page, /Suspense/);
  assert.match(page, /Loading work orders…/);
  assert.match(page, /workOrders\('\?page=1&pageSize=100'\)/);
  assert.match(page, /initialItems=\{workOrders\.items\}/);
});

test('technician image inputs surface an immediate local preview without changing evidence persistence', async () => {
  const [layout, preview, jobBrief] = await Promise.all([
    read('app/technician/layout.tsx'),
    read('app/technician/components/photo-selection-preview.tsx'),
    read('app/technician/components/job-brief.tsx'),
  ]);
  assert.match(layout, /PhotoSelectionPreview/);
  assert.match(preview, /URL\.createObjectURL\(file\)/);
  assert.match(preview, /file\.type\.startsWith\('image\/'\)/);
  assert.match(preview, /Preview of the selected job photo/);
  assert.match(jobBrief, /saveEvidence\(/);
  assert.match(jobBrief, /compressPhoto\(original\)/);
});

test('brand tuning is loaded last and lightens the shared burgundy token', async () => {
  const [layout, tuning] = await Promise.all([
    read('app/layout.tsx'),
    read('app/os-tuning.css'),
  ]);
  assert.ok(layout.indexOf("import './os-tuning.css';") > layout.indexOf("import './homent-os-v2.css';"));
  assert.match(tuning, /--homent-burgundy-900:\s*#481421;/i);
  assert.match(tuning, /\.technicianPhotoPreview/);
});
