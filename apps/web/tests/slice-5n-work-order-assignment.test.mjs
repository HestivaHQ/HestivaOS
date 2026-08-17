import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const schema = readFileSync(new URL('../../api/prisma/schema.prisma', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../../api/prisma/migrations/20260817120000_work_order_technician_assignments/migration.sql', import.meta.url), 'utf8');
const manager = readFileSync(new URL('../app/work-orders/work-orders-manager.tsx', import.meta.url), 'utf8');
const detail = readFileSync(new URL('../app/work-orders/[id]/technician-job-view.tsx', import.meta.url), 'utf8');
const controller = readFileSync(new URL('../../api/src/work-orders/work-orders.controller.ts', import.meta.url), 'utf8');

test('normalized assignment is unique, queryable by Technician, and backfills history', () => {
  assert.match(schema, /model WorkOrderTechnician[\s\S]*@@id\(\[workOrderId, technicianId\]\)[\s\S]*@@index\(\[technicianId, workOrderId\]\)/);
  assert.match(migration, /SELECT "id", "technician_id" FROM "work_orders" WHERE "technician_id" IS NOT NULL/);
});

test('ADMIN assignment UI supports Crew prepopulation, search, multiple adjustment, and Unassigned display', () => {
  assert.match(controller, /@Patch\(':id\/assignment'\)[\s\S]*@Roles\(UserRole\.ADMIN\)/);
  assert.match(manager, /eligibleCrewIds[\s\S]*Search eligible technicians[\s\S]*type="checkbox"/);
  assert.match(manager, /assignedTechnicians\.map[\s\S]*'Unassigned'/);
  assert.match(detail, /Assigned technicians[\s\S]*assignedTechnicians\.map[\s\S]*'Unassigned'/);
});
