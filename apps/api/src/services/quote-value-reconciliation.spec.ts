import { describe, expect, it } from '@jest/globals';
import { canonicalServiceName, frequencyMappings, legacyFrequencyAliases, serviceAliases } from './quote-value-reconciliation';

const migrationSql = require('node:fs').readFileSync(require('node:path').resolve(__dirname, '../../prisma/migrations/20260810233000_service_availability_and_addon_reconciliation/migration.sql'), 'utf8');
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

  it.each(['Inside oven', 'Inside fridge', 'Inside cupboards', 'Interior windows', 'Laundry folding', 'Ironing', 'Bed making', 'Linen change', 'Balcony or patio', 'Garage sweep', 'Extra bathroom', 'Extra refrigerator', 'Pet-hair treatment', 'Eco-friendly products', 'Post-renovation dust removal'])('documents current add-on %s', (value) => {
    expect(mappingDoc).toContain(`| ${value} |`);
  });
});
