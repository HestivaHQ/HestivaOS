import {
  classifyLaunchBaselineTables,
  LAUNCH_BASELINE_CONFIRMATION,
  LAUNCH_BASELINE_PRESERVED_TABLES,
  LAUNCH_BASELINE_RESET_TABLES,
  quoteSqlIdentifier,
} from './launch-baseline-reset.contract';

describe('launch baseline reset contract', () => {
  it('keeps protected launch configuration disjoint from disposable state', () => {
    const preserved = new Set<string>(LAUNCH_BASELINE_PRESERVED_TABLES);
    for (const table of LAUNCH_BASELINE_RESET_TABLES) expect(preserved.has(table)).toBe(false);
    expect(preserved.has('_prisma_migrations')).toBe(true);
    expect(preserved.has('users')).toBe(true);
    expect(preserved.has('user_access_changes')).toBe(true);
    expect(preserved.has('business_profiles')).toBe(true);
    expect(preserved.has('services')).toBe(true);
    expect(preserved.has('service_scope_template_versions')).toBe(true);
    expect(preserved.has('correspondence_template_versions')).toBe(true);
  });

  it('covers launch-critical operational and raw-SQL residue', () => {
    const reset = new Set<string>(LAUNCH_BASELINE_RESET_TABLES);
    for (const table of [
      'customers',
      'properties',
      'quotes',
      'work_orders',
      'shifts',
      'recurring_service_agreements',
      'execution_section_evidence',
      'work_order_incidents',
      'work_order_material_changes',
      'work_order_scope_mismatch_resolutions',
      'work_order_interruptions',
      'work_order_replacement_visits',
      'quote_customer_access_grants',
      'quote_customer_view_challenges',
      'quote_customer_engagement_events',
      'quote_customer_responses',
      'messaging_quote_flow_sessions',
      'messaging_media_assets',
      'correspondence_provider_events',
      'website_enquiries',
      'work_order_daily_counters',
      'quote_daily_counters',
      'enquiry_daily_counters',
    ]) expect(reset.has(table)).toBe(true);
  });

  it('fails closed when a public table has no reviewed reset classification', () => {
    expect(classifyLaunchBaselineTables(['users', 'customers', 'new_unreviewed_runtime_table'])).toEqual({
      unknownTables: ['new_unreviewed_runtime_table'],
      resetTablesPresent: ['customers'],
      preservedTablesPresent: ['users'],
    });
  });

  it('allows SQL identifiers only from the reviewed reset list', () => {
    expect(quoteSqlIdentifier('customers')).toBe('"customers"');
    expect(() => quoteSqlIdentifier('users')).toThrow('Unapproved launch-reset table');
    expect(() => quoteSqlIdentifier('made_up_table')).toThrow('Unapproved launch-reset table');
  });

  it('uses an unambiguous destructive confirmation phrase', () => {
    expect(LAUNCH_BASELINE_CONFIRMATION).toBe('RESET HESTIVAOS TO LAUNCH BASELINE');
  });
});
