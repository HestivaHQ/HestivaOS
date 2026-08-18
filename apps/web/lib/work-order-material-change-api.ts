import type { HomeCondition, WorkOrderFrequency, WorkOrderStatus } from './api';

const rawApiUrl =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:4000';
const API_URL = rawApiUrl.trim().replace(/\/+$/, '').replace(/\/api\/v1$/, '');

export type MaterialChangeAddOn = {
  serviceId: string;
  quantity: number;
  capacityApproved?: boolean;
};

export type MaterialChangePayload = {
  customerId?: string;
  propertyId?: string;
  serviceId?: string;
  addOns?: MaterialChangeAddOn[];
  frequency?: WorkOrderFrequency | null;
  customFrequencyNote?: string | null;
  homeCondition?: HomeCondition | null;
  scheduledAt?: string | null;
  status?: WorkOrderStatus;
};

export type MaterialChangeConsequences = {
  schedulingReview: boolean;
  staffingReview: boolean;
  pricingReview: boolean;
  executionScopeReview: boolean;
  customerCorrespondenceEligible: boolean;
  financialReviewBoundary: boolean;
};

export type MaterialChangePreview = {
  workOrderId: string;
  reference: string | null;
  expectedUpdatedAt: string;
  currentStatus: WorkOrderStatus;
  stage: 'PENDING' | 'FUTURE' | 'IMMINENT' | 'IN_PROGRESS' | 'HISTORICAL';
  materialFields: string[];
  allowed: boolean;
  overrideReasonRequired: boolean;
  blockedReason: string | null;
  consequences: MaterialChangeConsequences;
  boundaries: { correspondence: string | null; finance: string | null };
};

export type MaterialChangeHistory = {
  id: string;
  operationId: string;
  workOrderId: string;
  actorId: string;
  stage: string;
  reason: string | null;
  overrideReason: string | null;
  previousSnapshot: unknown;
  requestedChanges: unknown;
  consequences: unknown;
  createdAt: string;
};

async function request<T>(accessToken: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    let message = 'Unable to process the Work Order material change.';
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) message = body.message.join(' ');
      else if (body.message) message = body.message;
    } catch {
      // Keep the safe fallback for non-JSON errors.
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export function previewWorkOrderMaterialChange(accessToken: string, id: string, payload: MaterialChangePayload) {
  return request<MaterialChangePreview>(accessToken, `/work-orders/${id}/material-change/preview`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function commitWorkOrderMaterialChange(
  accessToken: string,
  id: string,
  payload: MaterialChangePayload & {
    operationId: string;
    expectedUpdatedAt: string;
    reason?: string;
    overrideReason?: string;
  },
) {
  return request<{ materialChange: MaterialChangeHistory; replayed: boolean }>(accessToken, `/work-orders/${id}/material-change`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function workOrderMaterialChangeHistory(accessToken: string, id: string) {
  return request<MaterialChangeHistory[]>(accessToken, `/work-orders/${id}/material-changes`);
}
