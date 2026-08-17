import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const schema = readFileSync(new URL('../../api/prisma/schema.prisma', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../../api/prisma/migrations/20260812054500_add_on_quantities/migration.sql', import.meta.url), 'utf8');
const workOrders = readFileSync(new URL('../../api/src/work-orders/work-orders.service.ts', import.meta.url), 'utf8');
const recurring = readFileSync(new URL('../../api/src/recurring-service-agreements/recurring-service-agreements.service.ts', import.meta.url), 'utf8');
const recurringManager = readFileSync(new URL('../app/recurring-services/recurring-services-manager.tsx', import.meta.url), 'utf8');
const webApi = readFileSync(new URL('../lib/api.ts', import.meta.url), 'utf8');

test('both operational add-on joins persist positive quantities', () => {
  assert.match(schema, /model WorkOrderAddOn[\s\S]*quantity Int @default\(1\)/);
  assert.match(schema, /model RecurringServiceAgreementAddOn[\s\S]*quantity Int @default\(1\)/);
  assert.match(migration, /work_order_add_ons[\s\S]*ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1/);
  assert.match(migration, /recurring_service_agreement_add_ons[\s\S]*ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1/);
  assert.match(migration, /quantity_positive/);
});

test('work orders use structured add-ons and persist quantity', () => {
  assert.match(workOrders, /addOns\?: AddOnSelectionInput\[\]/);
  assert.match(workOrders, /create: requestedAddOns\.map\(\(\{ serviceId, quantity \}\) => \(\{ serviceId, quantity \}\)\)/);
  assert.match(workOrders, /positive integer quantity/);
  assert.match(workOrders, /capacityApproved/);
});

test('recurring agreements propagate quantity into generated work orders', () => {
  assert.match(recurring, /quantity: a\.quantity/);
  assert.match(recurring, /addOns: requestedAddOns/);
  assert.match(recurring, /capacityApproved/);
  assert.match(recurringManager, /Labour\/time capacity checked for this recurring plan/);
});

test('web API types expose quantities end to end', () => {
  assert.match(webApi, /export type AddOnSelectionInput\s*=\s*\{[\s\S]*?serviceId:\s*string;[\s\S]*?quantity:\s*number;[\s\S]*?capacityApproved\?:\s*boolean;[\s\S]*?\};/);
  assert.match(webApi, /addOns:\s*Array<\{\s*serviceId:\s*string;\s*quantity:\s*number;\s*service:\s*Service\s*\}>/);
  assert.match(webApi, /addOns\?:\s*AddOnSelectionInput\[\]/);
});
