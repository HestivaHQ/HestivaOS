import type { UserRole } from './api';

const rawApiUrl =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:4000';
const API_URL = rawApiUrl
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/api\/v1$/, '');

export type AttentionPriority = 'NORMAL' | 'HIGH' | 'CRITICAL';
export type AttentionQueue = 'OPERATIONS' | 'MANAGEMENT_REVIEW';
export type AttentionView = 'mine' | 'all';

export type AttentionItem = {
  id: string;
  conditionKey: string;
  type:
    | 'TODAY_UNASSIGNED_WORK_ORDER'
    | 'OVERDUE_WORK_ORDER'
    | 'COMPLETION_ACKNOWLEDGEMENT_REQUIRED'
    | 'WORK_ORDER_ACCESS_REQUIRED';
  priority: AttentionPriority;
  queue: AttentionQueue;
  state: 'OPEN' | 'RESOLVED';
  subjectType: string;
  subjectId: string;
  subjectReference: string | null;
  customerLabel: string | null;
  title: string;
  summary: string;
  actionLabel: string;
  actionHref: string;
  dueAt: string | null;
  ownerId: string | null;
  seenAt: string | null;
  seenById: string | null;
  openedAt: string;
  lastObservedAt: string;
  resolvedAt: string | null;
  occurrenceCount: number;
};

export type AttentionOwner = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  role: UserRole;
  eligibleQueues: AttentionQueue[];
};

export type AttentionOverview = {
  view: AttentionView;
  items: AttentionItem[];
  eligibleOwners: AttentionOwner[];
};

async function request<T>(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
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
    let message = 'Unable to update Needs Attention.';
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) message = body.message.join(' ');
      else if (body.message) message = body.message;
    } catch {
      // Preserve the safe fallback when the API does not return JSON.
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export function attentionOverview(
  accessToken: string,
  view: AttentionView = 'mine',
): Promise<AttentionOverview> {
  return request(accessToken, `/attention?view=${view}`);
}

export function markAttentionSeen(
  accessToken: string,
  id: string,
): Promise<AttentionItem> {
  return request(accessToken, `/attention/${id}/seen`, { method: 'PATCH' });
}

export function assignAttention(
  accessToken: string,
  id: string,
  ownerId: string | null,
): Promise<AttentionItem> {
  return request(accessToken, `/attention/${id}/assignment`, {
    method: 'PATCH',
    body: JSON.stringify({ ownerId }),
  });
}
