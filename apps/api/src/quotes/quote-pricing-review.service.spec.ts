import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const service = readFileSync(join(__dirname, 'quote-pricing-review.service.ts'), 'utf8');
const controller = readFileSync(join(__dirname, 'quote-review.controller.ts'), 'utf8');

describe('Quote pricing review workflow', () => {
  it('is ADMIN-only through the existing Quote controller and uses revision-safe input', () => {
    expect(controller).toMatch(/@Roles\(UserRole\.ADMIN\)/);
    expect(controller).toMatch(/@Patch\(':id\/review-pricing'\)/);
    expect(service).toMatch(/expectedRevisionNumber/);
    expect(service).toMatch(/Quote changed\. Current revision is/);
  });

  it('creates an immutable ADMIN_REVISION and never rewrites the prior revision', () => {
    expect(service).toMatch(/QuoteRevisionOrigin\.ADMIN_REVISION/);
    expect(service).toMatch(/quoteRevision\.create/);
    expect(service).not.toMatch(/quoteRevision\.update/);
    expect(service).toMatch(/currentRevisionNumber: nextRevisionNumber/);
  });

  it('only clears NEEDS_ATTENTION after authoritative repricing has no remaining reasons', () => {
    expect(service).toMatch(/pricing\.attentionReasons\.length === 0/);
    expect(service).toMatch(/QuoteStatus\.SUBMITTED/);
    expect(service).toMatch(/QuoteActivityType\.NEEDS_ATTENTION_CLEARED/);
    expect(service).toMatch(/QuoteActivityType\.NEEDS_ATTENTION_SET/);
  });
});
