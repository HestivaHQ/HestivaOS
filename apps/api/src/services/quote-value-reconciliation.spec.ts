import { describe, expect, it } from '@jest/globals';
import { canonicalServiceName, frequencyMappings, legacyFrequencyAliases, serviceAliases } from './quote-value-reconciliation';

const enumMigrationSql = require('node:fs').readFileSync(require('node:path').resolve(__dirname, '../../prisma/migrations/20260810233000_service_availability_and_addon_reconciliation/migration.sql'), 'utf8');
const dataMigrationSql = require('node:fs').readFileSync(require('node:path').resolve(__dirname, '../../prisma/migrations/20260810233100_service_availability_and_addon_data/migration.sql'), 'utf8');
const propertyVocabularySql = require('node:fs').readFileSync(require('node:path').resolve(__dirname, '../../prisma/migrations/20260810180000_property_quote_vocabulary/migration.sql'), 'utf8');
const propertyProfileSql = require('node:fs').readFileSync(require('node:path').resolve(__dirname, '../../prisma/migrations/20260812120000_property_operational_profile/migration.sql'), 'utf8');
const migrationReplayScript = require('node:fs').readFileSync(require('node:path').resolve(__dirname, '../../../../scripts/test_postgres_migrations.sh'), 'utf8');
const migrationSql = `${enumMigrationSql}\n${dataMigrationSql}`;
const mappingDoc = require('node:fs').readFileSync(require('node:path').resolve(__dirname, '../../../../docs/QUOTE_TO_OS_VALUE_MAPPING.md'), 'utf8');

describe('current quote value reconciliation', () => {
  it.each([
    ['Inside oven', 'inside oven cleaning'],
    ['Inside fridge', 'inside fridge cleaning'],
    ['Inside cupboards', 'interior cupboard cleaning'],
    ['Eco-Friendly Cleaning', 'eco-conscious cleaning'],
  ])('maps %s to its existing canonical capability', (input, expected) => {
    expect(canonicalServiceName(input)).toBe(expected);
  });

  it('does not erase the additional-unit semantics of Extra refrigerator', () => {
    expect(serviceAliases).not.toHaveProperty('extra refrigerator');
    expect(canonicalServiceName('Extra refrigerator')).toBe('extra refrigerator');
  });

  it('maps the five current frequencies without service-specific restrictions', () => {
    expect(frequencyMappings).toEqual({ 'one-time': 'ONE_TIME', weekly: 'WEEKLY', 'every two weeks': 'EVERY_TWO_WEEKS', monthly: 'MONTHLY', custom: 'CUSTOM' });
    expect(legacyFrequencyAliases.fortnightly).toBe('EVERY_TWO_WEEKS');
  });

  it('contains no stale Service Scope schema or bootstrap', () => {
    expect(migrationSql).not.toMatch(/ServiceScope|service_scope|Whole Home|Selected Rooms|Single Bathroom|Selected Windows/);
  });

  it('does not create quote-flow pseudo-services and preserves historical Work Orders', () => {
    expect(migrationSql).not.toMatch(/'Add-on Services'|'Not sure'/);
    expect(migrationSql).not.toMatch(/UPDATE\s+"work_orders"/i);
  });

  it('preserves canonical capability IDs and bootstraps approved add-ons idempotently', () => {
    expect(migrationSql).toContain("WHERE \"normalized_name\" IN ('interior window cleaning', 'laundry folding')");
    expect(migrationSql).not.toMatch(/INSERT[\s\S]*'Interior Window Cleaning'|INSERT[\s\S]*'Laundry Folding'/);
    expect(migrationSql).toContain('ON CONFLICT DO NOTHING');
  });

  it('commits ServiceType.BOTH before any migration uses it', () => {
    expect(enumMigrationSql).toContain("ALTER TYPE \"ServiceType\" ADD VALUE IF NOT EXISTS 'BOTH'");
    expect(enumMigrationSql).not.toContain("'BOTH'::\"ServiceType\"");
    expect(dataMigrationSql).toContain("'BOTH'::\"ServiceType\"");
  });

  it('supports property vocabulary replay before the historical profile migration', () => {
    expect(propertyVocabularySql).toContain(`to_regtype('"BedroomCount"') IS NULL`);
    expect(propertyVocabularySql).toContain(`to_regtype('"StoreyCount"') IS NULL`);
    expect(propertyProfileSql).toContain(`to_regtype('"BedroomCount"') IS NULL`);
    expect(propertyProfileSql).toContain(`to_regtype('"StoreyCount"') IS NULL`);
    expect(propertyProfileSql).toContain('ADD COLUMN IF NOT EXISTS "bedrooms"');
  });

  it('constructs staged replay from real directories before the 5K boundary', () => {
    expect(migrationReplayScript).not.toContain('migration_lock.toml');
    expect(migrationReplayScript).toContain('boundary="20260810233000_service_availability_and_addon_reconciliation"');
    expect(migrationReplayScript).toContain('if [[ "$migration_name" < "$boundary" ]]');
    expect(migrationReplayScript).toContain('actual_pre_5k');
  });

  it.each(['Inside oven', 'Inside fridge', 'Inside cupboards', 'Interior windows', 'Laundry folding', 'Ironing', 'Bed making', 'Linen change', 'Balcony or patio', 'Garage sweep', 'Extra bathroom', 'Extra refrigerator', 'Pet-hair treatment', 'Eco-friendly products', 'Post-renovation dust removal'])('documents current add-on %s', (value) => {
    expect(mappingDoc).toContain(`| ${value} |`);
  });
});
