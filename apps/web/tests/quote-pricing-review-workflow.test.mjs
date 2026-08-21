import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const quotePage = source('../app/quotes/[id]/page.tsx');
const reviewPage = source('../app/quotes/[id]/pricing-review/page.tsx');
const review = source('../app/quotes/[id]/pricing-review/quote-pricing-review.tsx');
const client = source('../lib/quote-pricing-review-api.ts');

test('Quote detail exposes a clear pricing-review action and keeps the page ADMIN-only', () => {
  assert.match(quotePage, /Resolve pricing review/);
  assert.match(quotePage, /pricing-review/);
  assert.match(reviewPage, /appUser\.role !== 'ADMIN'/);
});

test('pricing review collects only canonical missing add-on facts', () => {
  for (const value of ['Inside Oven Cleaning', 'Garage Sweeping', 'Extra Bathroom Cleaning', 'Pet-Hair Treatment']) assert.match(review, new RegExp(value));
  assert.match(review, /Standard \/ single — R350/);
  assert.match(review, /Severe baked-on grease \(\+R150\)/);
  assert.match(review, /Empty double garage — R400/);
  assert.match(review, /Large \/ master bathroom — R300/);
  assert.match(review, /R150/);
  assert.match(review, /Save details and recheck Quote/);
});

test('pricing review creates a new server revision rather than mutating the customer payload locally', () => {
  assert.match(client, /PATCH/);
  assert.match(client, /review-pricing/);
  assert.match(client, /expectedRevisionNumber/);
  assert.doesNotMatch(review, /structuredData\s*=/);
  assert.match(review, /customer’s original submission is not changed/);
});
