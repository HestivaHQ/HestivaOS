'use client';

import { createClient } from '../../../../lib/supabase/client';

export type LaunchBaselineImpact = {
  confirmationPhrase: string;
  impactFingerprint: string;
  ready: boolean;
  blockers: string[];
  unknownTables: string[];
  resetTablesPresent: string[];
  preservedTablesPresent: string[];
  tableCounts: Record<string, number>;
  totalRowsToDelete: number;
  storage: {
    workOrderObjects: number;
    messagingObjects: number;
    unresolvedQuotePhotoObjects: number;
    serviceRoleConfigured: boolean;
  };
  preserved: {
    users: number;
    userAccessChanges: number;
    businessProfile: number;
    services: number;
    cleaningJobTemplates: number;
    correspondenceTemplates: number;
  };
  irreversibleExternalEffectsWarning: string;
};

export type LaunchBaselineResetResult = {
  reset: true;
  deletedDatabaseRows: number;
  deletedStorageObjects: number;
  verification: LaunchBaselineImpact;
};

function apiOrigin() {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  return raw.trim().replace(/\/+$/, '').replace(/\/api\/v1$/, '');
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Your authenticated session is required.');
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);
  if (init?.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${apiOrigin()}/api/v1${path}`, { ...init, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string | string[] } | null;
    const message = Array.isArray(payload?.message) ? payload?.message.join(' ') : payload?.message;
    throw new Error(message || `Request failed (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

export function previewLaunchBaselineReset() {
  return request<LaunchBaselineImpact>('/admin/launch-baseline-reset/impact');
}

export function executeLaunchBaselineReset(confirmationPhrase: string, impactFingerprint: string) {
  return request<LaunchBaselineResetResult>('/admin/launch-baseline-reset/execute', {
    method: 'POST',
    body: JSON.stringify({ confirmationPhrase, impactFingerprint }),
  });
}
