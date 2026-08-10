import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(resolve(process.cwd(), 'prisma/migrations/20260810230000_bootstrap_website_property_types/migration.sql'), 'utf8');

describe('website Property Type bootstrap contract', () => {
  it('contains exactly the approved public website catalogue', () => {
    expect(migration).toContain("ARRAY['Apartment', 'Townhouse', 'House', 'Duplex', 'Other']");
    expect(migration).not.toMatch(/Not classified|Apartment \/ Flat|Office|Commercial Premises/);
  });
  it('is idempotent, case/whitespace safe, and preserves inactive and custom records', () => {
    expect(migration).toContain('lower(trim(label))');
    expect(migration).toContain('ELSIF NOT EXISTS');
    expect(migration).toContain('is_active = false');
    expect(migration).not.toMatch(/UPDATE business_list_options|DELETE FROM|TRUNCATE/i);
  });
});
