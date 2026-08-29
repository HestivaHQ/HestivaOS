const rawApiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const API_URL = rawApiUrl.trim().replace(/\/+$/, '').replace(/\/api\/v1$/, '');

export type MessagingIdentityReviewState = 'UNLINKED' | 'UNVERIFIED' | 'TRUSTED' | 'BLOCKED' | 'RETIRED' | 'CONFLICT';
export type MessagingCustomerOption = { id: string; name: string; contactName: string | null; accountType?: 'INDIVIDUAL' | 'ORGANISATION' };
export type MessagingCustomerContact = { id: string; customerId: string; name: string; relationship: string | null; email: string | null; phone: string | null; isPrimary: boolean; status: 'ACTIVE' | 'RETIRED' };

export type MessagingConversationSummary = {
  id: string;
  channel: 'MESSENGER' | 'WHATSAPP';
  provider: string;
  customerId: string | null;
  customer: { id: string; name: string; contactName: string | null } | null;
  identityReview: {
    state: MessagingIdentityReviewState;
    identityId: string | null;
    trustState: string | null;
    retiredAt: string | null;
    contact: { id: string; name: string; status: string; customerId: string } | null;
  };
  manualReplySupported: boolean;
  replyEligible: boolean;
  latestInboundAt: string | null;
  latestMessage: { id: string; direction: 'INBOUND' | 'OUTBOUND'; kind: string; contentText: string | null; occurredAt: string } | null;
};

export type ManualMessengerReplyResult = { messageId: string; providerMessageId: string; acceptedAt: string };
export type WhatsAppAppReviewResult = { providerMessageId: string; acceptedAt: string; templateName: string };

async function request<T>(accessToken: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    let message = `Messaging request failed with status ${response.status}.`;
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) message = body.message.join(' ');
      else if (body.message) message = body.message;
    } catch {}
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export function messagingConversations(accessToken: string): Promise<MessagingConversationSummary[]> {
  return request(accessToken, '/messaging/conversations');
}

export function messagingCustomerOptions(accessToken: string, search = ''): Promise<MessagingCustomerOption[]> {
  return request(accessToken, `/customers/selector-options${search ? `?search=${encodeURIComponent(search)}` : ''}`);
}

export function messagingCustomerContacts(accessToken: string, customerId: string): Promise<MessagingCustomerContact[]> {
  return request(accessToken, `/customers/${customerId}/contacts`);
}

export function createMessagingCustomer(accessToken: string, input: { ownerId: string; accountType: 'INDIVIDUAL' | 'ORGANISATION'; name?: string; contactName?: string; email?: string; phone?: string }): Promise<MessagingCustomerOption> {
  return request(accessToken, '/customers', { method: 'POST', body: JSON.stringify(input) });
}

export function createMessagingCustomerContact(accessToken: string, customerId: string, input: { name: string; email?: string; phone?: string; relationship?: string }): Promise<MessagingCustomerContact> {
  return request(accessToken, `/customers/${customerId}/contacts`, { method: 'POST', body: JSON.stringify(input) });
}

export function linkMessagingCustomer(accessToken: string, conversationId: string, customerId: string) {
  return request(accessToken, `/messaging/conversations/${conversationId}/customer-link`, { method: 'PUT', body: JSON.stringify({ customerId }) });
}

export function trustMessagingIdentity(accessToken: string, conversationId: string, contactId: string) {
  return request(accessToken, `/messaging/conversations/${conversationId}/trusted-identity`, { method: 'PUT', body: JSON.stringify({ contactId }) });
}

export function sendManualMessengerReply(accessToken: string, conversationId: string, input: { requestId: string; text: string }): Promise<ManualMessengerReplyResult> {
  return request(accessToken, `/messaging/conversations/${conversationId}/manual-replies`, { method: 'POST', body: JSON.stringify(input) });
}

export function sendWhatsAppAppReviewTemplate(accessToken: string, to: string): Promise<WhatsAppAppReviewResult> {
  return request(accessToken, '/messaging/app-review/whatsapp/test-template', { method: 'POST', body: JSON.stringify({ to }) });
}
