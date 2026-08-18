import { apiBase } from './api-base';

export type ScopeMismatchResolutionCode = 'NO_CHANGE_REQUIRED' | 'NON_CHARGEABLE_ADJUSTMENT' | 'CHARGEABLE_ADDITIONAL_WORK' | 'DECLINE_ADDITIONAL_WORK';
export type CustomerApprovalStatus = 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'DECLINED';
export type CustomerApprovalMethod = 'PHONE' | 'WHATSAPP' | 'EMAIL' | 'IN_PERSON' | 'OTHER';

export type ScopeMismatchResolution = {
  id: string; operationId: string; outcomeEventId: string; actorId: string;
  resolution: ScopeMismatchResolutionCode; customerApprovalStatus: CustomerApprovalStatus;
  customerApprovalMethod: CustomerApprovalMethod | null; customerApprovedAt: string | null;
  proposedAmountMinor: number | null; capacityReviewed: boolean; note: string | null; createdAt: string;
};
export type ScopeMismatch = {
  id: string; note: string | null; fieldRecordedAt: string; serverReceivedAt: string;
  technician: { id: string; firstName: string; lastName: string };
  section: { id: string; stableKey: string; title: string; scopeRevisionId: string };
  evidence: Array<{ id: string; syncState: string; storagePath: string | null; capturedAt: string }>;
  resolutionHistory: ScopeMismatchResolution[]; latestResolution: ScopeMismatchResolution | null; additionalWorkMayBegin: boolean;
};
export type ScopeMismatchList = { workOrderId: string; reference: string | null; frozenScopeRevisionId: string | null; mismatches: ScopeMismatch[]; boundaries: Record<string, string> };

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message ?? `Request failed (${response.status})`);
  return body as T;
}

export function listScopeMismatches(workOrderId: string, token: string) {
  return request<ScopeMismatchList>(`/work-orders/${workOrderId}/scope-mismatches`, token);
}

export function resolveScopeMismatch(workOrderId: string, eventId: string, token: string, input: {
  operationId: string; resolution: ScopeMismatchResolutionCode; customerApprovalStatus?: CustomerApprovalStatus;
  customerApprovalMethod?: CustomerApprovalMethod; customerApprovedAt?: string; proposedAmountMinor?: number;
  capacityReviewed?: boolean; note?: string;
}) {
  return request<{ resolution: ScopeMismatchResolution; replayed: boolean; additionalWorkMayBegin: boolean }>(`/work-orders/${workOrderId}/scope-mismatches/${eventId}/resolve`, token, { method: 'POST', body: JSON.stringify(input) });
}
