import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(resolve(process.cwd(), 'prisma/migrations/20260810220000_canonical_service_catalogue/migration.sql'), 'utf8');

describe('canonical service catalogue migration contract', () => {
  it('contains each approved record once in the insert catalogue', () => {
    const insertCatalogue = migration.slice(migration.indexOf('-- Create only missing approved records.'));
    const names = ['Regular Home Cleaning', 'Deep Cleaning', 'Move-In Cleaning', 'Move-Out Cleaning', 'Kitchen Cleaning', 'Bathroom Sanitisation', 'Bedroom Cleaning', 'Living Area Cleaning', 'Interior Window Cleaning', 'Apartment Cleaning', 'Eco-Conscious Cleaning', 'Laundry Folding', 'Inside Fridge Cleaning', 'Inside Oven Cleaning', 'Interior Cupboard Cleaning', 'Extra Laundry Folding', 'Balcony Sweeping', 'Additional Room Cleaning'];
    for (const name of names) expect(insertCatalogue.match(new RegExp(`'${name}'`, 'g'))).toHaveLength(1);
  });

  it('is non-destructive, idempotent, and preserves relationship identities', () => {
    expect(migration).toContain('WHERE NOT EXISTS');
    expect(migration).not.toMatch(/DELETE FROM|TRUNCATE|DROP TABLE/i);
    expect(migration).not.toMatch(/UPDATE "cleaning_job_templates"|DELETE FROM "_CleaningJobTemplateToService"/i);
  });

  it('does not import quote pseudo-options or the add-on grouping page', () => {
    expect(migration).not.toContain('Multiple Services Required');
    expect(migration).not.toContain('Other (Please Describe)');
    expect(migration).not.toContain("'Cleaning Add-On Services'");
  });
});
