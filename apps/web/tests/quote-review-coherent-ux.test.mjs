import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../app/quotes/[id]/quote-review.tsx', import.meta.url), 'utf8');

test('Quote review presents the complete submission in operational order', () => {
  const headings = [
    '1. Customer & contact',
    '2. Service requested',
    '3. Property & size',
    '4. Visit & schedule',
    '5. Access & arrival',
    '6. Household, pets & safety',
    '7. Extras, laundry & special requests',
    '8. Customer notes',
    '9. Photo details',
    '10. Price breakdown',
    '11. Customer & property decision',
  ];

  let previous = -1;
  for (const heading of headings) {
    const position = source.indexOf(heading);
    assert.ok(position > previous, `${heading} should appear after the previous review section`);
    previous = position;
  }

  assert.match(source, /Other captured details/);
  assert.match(source, /Technical submission details/);
  assert.match(source, /Field source paths/);
  assert.doesNotMatch(source, /Field paths are shown so each pricing and operational input/);
});

test('Needs-attention state explains stored reasons without bypassing acceptance safeguards', () => {
  assert.match(source, /NEEDS_ATTENTION_SET/);
  assert.match(source, /What needs attention/);
  assert.match(source, /What to do:/);
  assert.match(source, /ADD_ON_DETAIL_REQUIRED/);
  assert.match(source, /Admin revision is required before the price can be finalised/);
  assert.match(source, /disabled=\{saving \|\| !preflight\?\.eligibleForAcceptance\}/);
  assert.doesNotMatch(source, /mark resolved/i);
  assert.doesNotMatch(source, /force accept/i);
});

test('Quote review uses simple operational language', () => {
  assert.match(source, /Choose whether this request belongs to an existing customer\/property/);
  assert.match(source, /Save customer & property decision/);
  assert.doesNotMatch(source, /match-or-review requires/i);
  assert.doesNotMatch(source, /Submitted identity will create/i);
});
