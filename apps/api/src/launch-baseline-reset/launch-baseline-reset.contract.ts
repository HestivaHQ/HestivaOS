export const LAUNCH_BASELINE_CONFIRMATION = 'RESET HESTIVAOS TO LAUNCH BASELINE';

/**
 * Tables that define the durable launch configuration/security baseline.
 * The launch reset must never remove these rows.
 */
export const LAUNCH_BASELINE_PRESERVED_TABLES = [
  '_prisma_migrations',
  '_CleaningJobTemplateToService',
  'users',
  'user_access_changes',
  'business_profiles',
  'business_list_options',
  'services',
  'service_scope_templates',
  'service_scope_template_versions',
  'service_scope_template_sections',
  'cleaning_job_templates',
  'correspondence_templates',
  'correspondence_template_versions',
] as const;

/**
 * Disposable pre-launch operational/workforce state. This list is intentionally
 * explicit: the reset never uses TRUNCATE ... CASCADE. Any new public table that
 * is not classified here or in the preserved list blocks the reset until its
 * launch-baseline semantics are reviewed.
 */
export const LAUNCH_BASELINE_RESET_TABLES = [
  'customer_messaging_identities',
  'customer_contacts',
  'customers',
  'properties',
  'crew_members',
  'crews',
  'employee_records',
  'technicians',
  'shifts',
  'recurring_service_agreement_add_ons',
  'recurring_service_agreements',
  'work_order_technicians',
  'work_order_add_ons',
  'work_order_access_readiness_events',
  'work_order_temporary_access_credential_events',
  'work_order_temporary_access_credentials',
  'work_order_access_recoveries',
  'work_order_quote_evidence',
  'work_order_customer_sign_offs',
  'work_order_photos',
  'work_order_checklist_items',
  'work_order_activities',
  'execution_section_evidence',
  'work_order_incident_reviews',
  'work_order_incidents',
  'execution_section_outcome_events',
  'work_order_completion_corrections',
  'work_order_execution_sections',
  'work_order_execution_scope_revisions',
  'work_order_scope_mismatch_resolutions',
  'work_order_material_changes',
  'work_order_interruption_routes',
  'work_order_replacement_visits',
  'work_order_interruptions',
  'work_orders',
  'work_order_daily_counters',
  'quote_customer_responses',
  'quote_customer_view_challenges',
  'quote_customer_engagement_events',
  'quote_customer_access_grants',
  'quote_activities',
  'quote_line_items',
  'quote_photos',
  'quote_revisions',
  'quotes',
  'quote_daily_counters',
  'attention_item_activities',
  'attention_items',
  'website_enquiries',
  'enquiry_daily_counters',
  'messaging_quote_flow_sessions',
  'messaging_media_assets',
  'messaging_provider_status_events',
  'messaging_message_status_events',
  'messaging_messages',
  'messaging_conversations',
  'correspondence_provider_events',
  'correspondence_delivery_attempt_events',
  'correspondence_delivery_attempts',
  'correspondence_records',
] as const;

export type LaunchBaselineResetTable = (typeof LAUNCH_BASELINE_RESET_TABLES)[number];

const preserved = new Set<string>(LAUNCH_BASELINE_PRESERVED_TABLES);
const reset = new Set<string>(LAUNCH_BASELINE_RESET_TABLES);

export function classifyLaunchBaselineTables(actualTables: readonly string[]) {
  const unknownTables = actualTables.filter((table) => !preserved.has(table) && !reset.has(table)).sort();
  const resetTablesPresent = actualTables.filter((table) => reset.has(table)).sort();
  const preservedTablesPresent = actualTables.filter((table) => preserved.has(table)).sort();
  return { unknownTables, resetTablesPresent, preservedTablesPresent };
}

export function quoteSqlIdentifier(identifier: string): string {
  if (!reset.has(identifier)) throw new Error(`Unapproved launch-reset table: ${identifier}`);
  return `"${identifier.replaceAll('"', '""')}"`;
}
