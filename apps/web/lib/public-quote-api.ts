export type PublicQuoteProjection = {
  business: Record<string, string>;
  quote: {
    reference: string;
    revisionNumber: number;
    status: 'SUBMITTED' | 'ACCEPTED' | 'DECLINED';
    actionable: boolean;
    validUntil: string;
    accessExpiresAt: string;
    property: Record<string, unknown>;
    request: Record<string, unknown>;
    visit: Record<string, unknown>;
    pricing: {
      currency: string;
      subtotalMinor: number;
      discountMinor: number;
      taxEnabled: boolean;
      taxMinor: number;
      totalMinor: number;
      lineItems: Array<{ type: string; label: string; description: string | null; quantity: number; unitAmountMinor: number; lineTotalMinor: number }>;
    };
  };
};

export type QuoteResponseResult = {
  state: 'CONVERTED' | 'PENDING_INTERNAL_COMPLETION' | 'DECLINED';
  replayed: boolean;
};

function apiBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  return raw.trim().replace(/\/+$/, '').replace(/\/api\/v1$/, '');
}

async function request<T>(path: string, capability: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}/api/v1/public/quote-access/${path}`, {
    ...init,
    method: init?.method ?? 'POST',
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
    credentials: 'omit',
    headers: {
      Authorization: `QuoteCapability ${capability}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const error = new Error('QUOTE_REQUEST_FAILED') as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return response.json() as Promise<T>;
}

export function capabilityFromFragment(fragment: string): string | null {
  const candidate = fragment.replace(/^#/, '');
  return /^[A-Za-z0-9_-]{43}$/.test(candidate) ? candidate : null;
}

export function resolvePublicQuote(capability: string) {
  return request<PublicQuoteProjection>('resolve', capability);
}

export function issueViewChallenge(capability: string) {
  return request<{ challenge: string }>('view-challenge', capability);
}

export function confirmQuoteView(capability: string, challenge: string) {
  return request<{ confirmed: boolean }>('view-confirm', capability, {
    body: JSON.stringify({ challenge, pageVisible: true }),
  });
}

export function respondToQuote(capability: string, decision: 'CUSTOMER_ACCEPTED' | 'CUSTOMER_DECLINED', idempotencyKey: string) {
  return request<QuoteResponseResult>('respond', capability, {
    body: JSON.stringify({ decision, idempotencyKey, confirmed: true }),
  });
}
