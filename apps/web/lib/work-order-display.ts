import { displayCustomerName } from './customer-display';
import type { WorkOrder } from './api';

export function workOrderReference(workOrder: Pick<WorkOrder, 'reference' | 'title'>) {
  return workOrder.reference || workOrder.title || 'Legacy work order';
}

export function workOrderDisplayLabel(workOrder: Pick<WorkOrder, 'service' | 'customer' | 'property' | 'title'>) {
  const structured = [workOrder.service?.name, displayCustomerName(workOrder.customer), workOrder.property?.name || workOrder.property?.addressLine1].filter(Boolean);
  return structured.length === 3 ? structured.join(' · ') : workOrder.title || structured.join(' · ') || 'Legacy work order';
}
