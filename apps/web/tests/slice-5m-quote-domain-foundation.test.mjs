import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const schema = readFileSync(new URL('../../api/prisma/schema.prisma', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../../api/prisma/migrations/20260811210000_quote_domain_foundation/migration.sql', import.meta.url), 'utf8');

test('quote domain has a stable reference, retry identity, commercial lifecycle, validity, and revision history', () => {
  assert.match(schema, /enum QuoteStatus \{[\s\S]*SUBMITTED[\s\S]*ACCEPTED[\s\S]*DECLINED[\s\S]*EXPIRED[\s\S]*NEEDS_ATTENTION[\s\S]*\}/);
  assert.match(schema, /model Quote \{[\s\S]*reference String @unique[\s\S]*submissionKey String @unique[\s\S]*currentRevisionNumber Int @default\(1\)[\s\S]*validUntil DateTime/);
  assert.match(schema, /model QuoteRevision \{[\s\S]*revisionNumber Int[\s\S]*structuredData Json[\s\S]*@@unique\(\[quoteId, revisionNumber\]\)/);
});

test('quote pricing snapshot stores minor-unit breakdown, discounts, and dormant tax fields', () => {
  assert.match(schema, /model QuoteRevision \{[\s\S]*currency String @default\("ZAR"\)[\s\S]*subtotalMinor Int[\s\S]*discountMinor Int @default\(0\)[\s\S]*discountReason String\?[\s\S]*taxEnabled Boolean @default\(false\)[\s\S]*taxMinor Int @default\(0\)[\s\S]*totalMinor Int/);
  assert.match(schema, /model QuoteLineItem \{[\s\S]*quantity Int @default\(1\)[\s\S]*unitAmountMinor Int[\s\S]*lineTotalMinor Int/);
});

test('quote photos preserve provenance, transfer identity, and transfer status without duplicating work-order photo ownership', () => {
  assert.match(schema, /enum QuotePhotoSource \{[\s\S]*CUSTOMER[\s\S]*ADMIN[\s\S]*\}/);
  assert.match(schema, /enum QuotePhotoStatus \{[\s\S]*PENDING[\s\S]*STORED[\s\S]*FAILED[\s\S]*\}/);
  assert.match(schema, /model QuotePhoto \{[\s\S]*quoteId String[\s\S]*quoteRevisionId String\?[\s\S]*transferKey String @unique[\s\S]*source QuotePhotoSource[\s\S]*status QuotePhotoStatus/);
});

test('migration creates the quote aggregate, unique retry identities, and atomic daily reference counter', () => {
  for (const table of ['quotes', 'quote_revisions', 'quote_line_items', 'quote_photos', 'quote_activities', 'quote_daily_counters']) {
    assert.match(migration, new RegExp(`CREATE TABLE "${table}"`));
  }
  assert.match(migration, /CREATE UNIQUE INDEX "quotes_reference_key"/);
  assert.match(migration, /CREATE UNIQUE INDEX "quotes_submission_key_key"/);
  assert.match(migration, /CREATE UNIQUE INDEX "quote_photos_transfer_key_key"/);
  assert.match(migration, /FOREIGN KEY \("quote_id"\) REFERENCES "quotes"\("id"\) ON DELETE CASCADE/);
});
