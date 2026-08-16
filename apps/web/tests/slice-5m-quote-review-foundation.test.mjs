import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const schema = readFileSync(new URL('../../api/prisma/schema.prisma', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../../api/prisma/migrations/20260815190000_quote_review_decision_foundation/migration.sql', import.meta.url), 'utf8');
const moduleSource = readFileSync(new URL('../../api/src/quotes/quotes.module.ts', import.meta.url), 'utf8');
const controller = readFileSync(new URL('../../api/src/quotes/quote-review.controller.ts', import.meta.url), 'utf8');

test('internal Quote review is separate, ADMIN-only, and exposes protected decisions', () => {
  assert.match(moduleSource, /QuoteReviewController/);
  assert.match(controller, /@Roles\(UserRole\.ADMIN\)/);
  assert.match(controller, /@Get\(':id\/preflight'\)/);
  assert.match(controller, /@Patch\(':id\/decline'\)/);
  assert.match(controller, /@Patch\(':id\/accept'\)/);
});

test('accepted revision and operational links have database integrity', () => {
  assert.match(schema, /acceptedRevisionId String\? @unique/);
  assert.match(schema, /acceptedRevision QuoteRevision\?/);
  assert.match(schema, /@@unique\(\[workOrderId\]\)/);
  assert.match(schema, /@@unique\(\[recurringAgreementId\]\)/);
  assert.match(migration, /quotes_accepted_revision_id_fkey/);
  assert.match(migration, /quotes_work_order_id_fkey/);
  assert.match(migration, /quotes_recurring_agreement_id_fkey/);
  assert.match(migration, /ON DELETE RESTRICT/);
});
