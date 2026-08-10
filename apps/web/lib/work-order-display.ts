import { displayCustomerName } from './customer-display';
import type { WorkOrder } from './api';

export function workOrderReference(workOrder: Pick<WorkOrder, 'reference' | 'title'>) {
  return workOrder.reference || workOrder.title || 'Legacy work order';
}

export function workOrderDisplayLabel(workOrder: Pick<WorkOrder, 'service' | 'customer' | 'property' | 'title'>) {
  const structured = [workOrder.service?.name, displayCustomerName(workOrder.customer), workOrder.property?.name || workOrder.property?.addressLine1].filter(Boolean);
  return structured.length === 3 ? structured.join(' · ') : workOrder.title || structured.join(' · ') || 'Legacy work order';
}

export const frequencyLabels = { ONE_TIME: 'One-time', WEEKLY: 'Weekly', EVERY_TWO_WEEKS: 'Every two weeks', MONTHLY: 'Monthly', CUSTOM: 'Custom' } as const;
export const homeConditionLabels = { LIGHT_UPKEEP: 'Light upkeep', STANDARD: 'Standard lived-in condition', EXTRA_ATTENTION: 'Needs extra attention', HEAVY_BUILDUP: 'Heavy build-up', RECENTLY_RENOVATED: 'Recently renovated', VACANT: 'Vacant property', MOVE_IN_OUT: 'Move-in / move-out condition' } as const;

export function workOrderFrequencyLabel(workOrder: Pick<WorkOrder, 'frequency' | 'customFrequencyNote'>) {
  if (!workOrder.frequency) return 'Not recorded';
  const label = frequencyLabels[workOrder.frequency];
  return workOrder.frequency === 'CUSTOM' && workOrder.customFrequencyNote ? `${label} — ${workOrder.customFrequencyNote}` : label;
}
