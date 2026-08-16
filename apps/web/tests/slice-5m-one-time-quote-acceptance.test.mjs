import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const service = readFileSync(new URL('../../api/src/quotes/quote-review.service.ts', import.meta.url), 'utf8');
const projection = readFileSync(new URL('../../api/src/quotes/quote-acceptance.ts', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../../api/prisma/migrations/20260816120000_atomic_one_time_quote_acceptance/migration.sql', import.meta.url), 'utf8');
const recurringMigration = readFileSync(new URL('../../api/prisma/migrations/20260816180000_atomic_recurring_quote_acceptance/migration.sql', import.meta.url), 'utf8');

test('ONE_TIME acceptance is one serializable operational transaction', () => {
  assert.match(service, /async accept\(/);
  assert.match(service, /TransactionIsolationLevel\.Serializable/);
  assert.match(service, /tx\.customer\.create/);
  assert.match(service, /tx\.property\.create/);
  assert.match(service, /tx\.workOrder\.create/);
  assert.match(service, /acceptedRevisionId: revision\.id/);
  assert.match(service, /status: QuoteStatus\.ACCEPTED/);
  assert.match(service, /error\.code === 'P2034'/);
});

test('Laundry and Ironing use quantity-bearing add-ons in both acceptance paths', () => {
  assert.match(projection, /serviceName: 'Laundry', quantity: laundryLoads/);
  assert.match(projection, /serviceName: 'Ironing', quantity: ironingLoads/);
  assert.match(projection, /projectAcceptedRecurringSubmission/);
  assert.match(service, /recurringServiceAgreement\.create/);
  assert.match(service, /addOns: addOns\.length/);
});

test('recurring accepted shape requires both agreement and initial WorkOrder linkage', () => {
  assert.match(recurringMigration, /quotes_accepted_operational_shape/);
  assert.match(recurringMigration, /"work_order_id" IS NOT NULL/);
  assert.match(service, /recurringAgreementId, recurrenceDate/);
  assert.match(service, /linkedWorkOrder\?\.recurringAgreementId === quote\.recurringAgreementId/);
});

test('database constraints require complete accepted linkage and prevent duplicate WorkOrder claims', () => {
  assert.match(migration, /quotes_accepted_operational_shape/);
  assert.match(migration, /"work_order_id" IS NOT NULL AND "recurring_agreement_id" IS NULL/);
  assert.match(migration, /quotes_customer_id_fkey/);
  assert.match(migration, /quotes_property_id_fkey/);
});
