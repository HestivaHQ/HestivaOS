const rawApiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const API_URL = rawApiUrl.trim().replace(/\/+$/, '').replace(/\/api\/v1$/, '');

export type MessagingIdentityReviewState = 'UNLINKED' | 'UNVERIFIED' | 'TRUSTED' | 'BLOCKED' | 'RETIRED' | 'CONFLICT';

export type MessagingConversationSummary = {
  id: string;
  channel: 'MESSENGER' | 'WHATSAPP';
  provider: string;
  customerId: string | null;
  customer: { id: string; name: string; contactName: string | null } | null;
  identityReviewState: MessagingIdentityReviewState;
  trustedContact: { id: string; name: string } | null;
  replyEligible: boolean;
  latestInboundAt: string | null;
  latestMessage: { id: string; direction: 'INBOUND' | 'OUTBOUND'; kind: string; contentText: string | null; occurredAt: string } | null;
};

export type ManualMessengerReplyResult = { messageId: string; providerMessageId: string; acceptedAt: string };

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

export function linkMessagingCustomer(accessToken: string, conversationId: string, customerId: string) {
  return request(accessToken, `/messaging/conversations/${conversationId}/customer-link`, {
    method: 'PUT',
    body: JSON.stringify({ customerId }),
  });
}

export function trustMessagingIdentity(accessToken: string, conversationId: string, contactId: string) {
  return request(accessToken, `/messaging/conversations/${conversationId}/trusted-identity`, {
    method: 'PUT',
    body: JSON.stringify({ contactId }),
  });
}

export function sendManualMessengerReply(accessToken: string, conversationId: string, input: { requestId: string; text: string }): Promise<ManualMessengerReplyResult> {
  return request(accessToken, `/messaging/conversations/${conversationId}/manual-replies`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
