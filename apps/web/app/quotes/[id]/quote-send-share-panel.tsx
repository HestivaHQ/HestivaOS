'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError, type QuoteDetail } from '../../../lib/api';
import { createClient } from '../../../lib/supabase/client';

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const API_URL = rawApiUrl.trim().replace(/\/+$/, '').replace(/\/api\/v1$/, '');

type Tracking = {
  revisionNumber: number;
  access: { accessState: string; firstViewedAt: string | null; lastViewedAt: string | null; viewCount: number };
  response: { decision: string; respondedAt: string; source: string } | null;
  email: Array<{ record_id: string; attempt_id: string; attempt_number: number; attempt_created_at: string; attempt_status: string; provider_reference: string | null; event_type: string | null; provider_occurred_at: string | null }>;
  whatsappComposerOpened: Array<{ occurredAt: string }>;
};

type SendResult = { state: 'PROVIDER_ACCEPTED' | 'PROVIDER_FAILED' | 'PENDING_RECONCILIATION' };
type WhatsAppResult = { composerUrl: string; evidence: 'WHATSAPP_COMPOSER_OPENED'; occurredAt: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data: { session } } = await createClient().auth.getSession();
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);
  const response = await fetch(`${API_URL}/api/v1${path}`, { cache: 'no-store', ...init, headers });
  const body = await response.json().catch(() => null) as { message?: string } | T | null;
  if (!response.ok) throw new ApiError((body as { message?: string } | null)?.message ?? `Request failed with status ${response.status}`, response.status);
  return body as T;
}

function when(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not yet';
}

export function QuoteSendSharePanel({ quoteId }: { quoteId: string }) {
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const current = await api.quote(quoteId);
      setQuote(current);
      const state = await request<Tracking>(`/quotes/${quoteId}/send-share/tracking?expectedRevisionNumber=${current.currentRevisionNumber}`);
      setTracking(state);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Send/share status could not be loaded.');
    }
  }, [quoteId]);

  useEffect(() => { void load(); }, [load]);
  const emailAttempts = useMemo(() => tracking ? new Map(tracking.email.map((row) => [row.attempt_id, row])).size : 0, [tracking]);
  const latestEmail = tracking?.email[0] ?? null;
  const providerEvents = tracking?.email.filter((row) => row.event_type).map((row) => row.event_type as string) ?? [];
  const emailState = providerEvents.includes('email.delivered') ? 'Delivered to recipient mail server' :
    providerEvents.some((event) => ['email.failed', 'email.bounced', 'email.suppressed'].includes(event)) ? 'Provider delivery failed' :
    providerEvents.includes('email.sent') ? 'Sent by Resend' :
    latestEmail?.attempt_status === 'ACCEPTED' ? 'Accepted by Resend' : latestEmail?.attempt_status === 'FAILED' ? 'Send failed' : latestEmail ? 'Pending reconciliation' : 'Not sent';

  async function sendEmail() {
    if (!quote || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await request<SendResult>(`/quotes/${quote.id}/send-share/email`, { method: 'POST', body: JSON.stringify({ expectedRevisionNumber: quote.currentRevisionNumber }) });
      setNotice(result.state === 'PROVIDER_ACCEPTED' ? 'Quote email accepted by Resend. This does not mean the customer viewed it.' : result.state === 'PROVIDER_FAILED' ? 'Resend rejected the email send. Review the delivery state before retrying.' : 'Email outcome is uncertain. Refresh tracking before deciding whether to resend.');
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Quote email could not be sent.'); }
    finally { setBusy(false); }
  }

  async function openWhatsApp() {
    if (!quote || busy) return;
    const popup = window.open('about:blank', '_blank');
    if (popup) popup.opener = null;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await request<WhatsAppResult>(`/quotes/${quote.id}/send-share/whatsapp-composer`, { method: 'POST', body: JSON.stringify({ expectedRevisionNumber: quote.currentRevisionNumber }) });
      if (popup) popup.location.replace(result.composerUrl); else window.location.assign(result.composerUrl);
      setNotice('WhatsApp composer opened. HestivaOS does not claim the message was sent or read.');
      await load();
    } catch (caught) {
      popup?.close();
      setError(caught instanceof Error ? caught.message : 'WhatsApp composer could not be opened.');
    } finally { setBusy(false); }
  }

  if (!quote) return <section className="quoteWorkspace"><p role="status">Loading Send / Share…</p>{error ? <div className="errorBanner" role="alert">{error}</div> : null}</section>;
  const canSend = quote.status === 'SUBMITTED';
  return <section className="quoteWorkspace quoteDetail" aria-labelledby="quote-send-share-title">
    <header className="pageHeader"><div><p className="eyebrow">Customer delivery</p><h2 id="quote-send-share-title">Send / Share</h2><p>Current Quote revision <strong>{quote.currentRevisionNumber}</strong></p></div></header>
    {error ? <div className="errorBanner" role="alert">{error}</div> : null}
    {notice ? <div className="successBanner" role="status">{notice}</div> : null}
    <div className="quoteCard">
      <h3>Send current revision</h3>
      <p>Email: <strong>{quote.customer?.email ?? quote.summary?.customerEmail ?? 'Not available'}</strong></p>
      <p>Mobile: <strong>{quote.customer?.phone ?? quote.summary?.customerMobile ?? 'Not available'}</strong></p>
      <div className="rowActions">
        <button className="primaryButton" type="button" disabled={!canSend || busy} onClick={() => void sendEmail()}>{emailAttempts ? 'Resend Quote email' : 'Send Quote by email'}</button>
        <button type="button" disabled={!canSend || busy} onClick={() => void openWhatsApp()}>Open WhatsApp</button>
        <button type="button" disabled={busy} onClick={() => void load()}>Refresh tracking</button>
      </div>
      {!canSend ? <p>This Quote is read-only for customer delivery because its current status is {quote.status}.</p> : null}
    </div>
    <div className="quoteCard">
      <h3>Delivery & customer evidence</h3>
      <p><strong>Email:</strong> {emailState}</p>
      <p><strong>WhatsApp:</strong> {tracking?.whatsappComposerOpened.length ? `Composer opened ${tracking.whatsappComposerOpened.length} time(s); latest ${when(tracking.whatsappComposerOpened[0]?.occurredAt)}` : 'Composer not opened'}</p>
      <p><strong>Secure Quote view:</strong> {tracking?.access.viewCount ? `Viewed ${tracking.access.viewCount} time(s); first ${when(tracking.access.firstViewedAt)}, latest ${when(tracking.access.lastViewedAt)}` : 'Not viewed'}</p>
      <p><strong>Customer response:</strong> {tracking?.response ? `${tracking.response.decision === 'CUSTOMER_ACCEPTED' ? 'Accepted' : 'Declined'} at ${when(tracking.response.respondedAt)}` : 'No response'}</p>
      <p><strong>Secure access:</strong> {tracking?.access.accessState ?? 'Unknown'}</p>
      <p className="muted">Provider acceptance or delivery is email transport evidence only. Customer-view evidence comes only from the secure Quote page VIEW_CONFIRMED protocol.</p>
    </div>
  </section>;
}
