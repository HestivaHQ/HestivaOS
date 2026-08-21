import { ApiError } from './api';

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? 'http://localhost:4000';
const API_URL = rawApiUrl.trim().replace(/\/+$/, '').replace(/\/api\/v1$/, '');

export type AddOnReviewDetail = {
  ovenSize?: 'STANDARD_SINGLE' | 'LARGE_DOUBLE';
  severeBakedOnGrease?: boolean;
  garageSize?: 'SINGLE' | 'DOUBLE' | 'LARGER_MULTI_CAR';
  bathroomType?: 'STANDARD' | 'LARGE_MASTER';
};

export type QuotePricingReviewResult = {
  quoteId: string;
  revisionNumber: number;
  status: 'SUBMITTED' | 'NEEDS_ATTENTION';
  pricing: {
    currency: string;
    subtotalMinor: number;
    adjustmentsMinor: number;
    totalMinor: number;
  };
  attentionReasons: Array<{ code: string; path: string; message: string }>;
};

export async function reviewQuotePricing(
  id: string,
  expectedRevisionNumber: number,
  addOns: Array<{ index: number; detail: AddOnReviewDetail }>,
): Promise<QuotePricingReviewResult> {
  const { createClient } = await import('./supabase/client');
  const { data: { session } } = await createClient().auth.getSession();
  const response = await fetch(`${API_URL}/api/v1/quotes/${encodeURIComponent(id)}/review-pricing`, {
    method: 'PATCH',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ expectedRevisionNumber, addOns }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string } | null;
    throw new ApiError(payload?.message ?? `API request failed with status ${response.status}`, response.status);
  }
  return response.json() as Promise<QuotePricingReviewResult>;
}
