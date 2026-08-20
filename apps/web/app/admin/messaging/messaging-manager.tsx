'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../../../lib/supabase/client';
import { messagingConversations, sendManualMessengerReply, type MessagingConversationSummary } from '../../../lib/messaging-api';

export function MessagingManager() {
  const [rows, setRows] = useState<MessagingConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<Record<string, string>>({});

  async function accessToken() {
    const { data: { session } } = await createClient().auth.getSession();
    if (!session?.access_token) throw new Error('Authenticated session is required.');
    return session.access_token;
  }

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const token = await accessToken();
      setRows(await messagingConversations(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load messaging conversations.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function send(row: MessagingConversationSummary) {
    const text = drafts[row.id]?.trim();
    if (!text || sendingId) return;
    setSendingId(row.id);
    setError(null);
    setSuccess((current) => ({ ...current, [row.id]: '' }));
    try {
      const token = await accessToken();
      const result = await sendManualMessengerReply(token, row.id, { requestId: crypto.randomUUID(), text });
      setDrafts((current) => ({ ...current, [row.id]: '' }));
      setSuccess((current) => ({ ...current, [row.id]: `Accepted by Messenger at ${new Date(result.acceptedAt).toLocaleString()}.` }));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send Messenger reply.');
    } finally {
      setSendingId(null);
    }
  }

  return <>
    <header className="pageHeader"><div><p className="eyebrow">Messaging</p><h2>Messenger conversations</h2><p>Send a deliberate ADMIN reply through the live HestivaOS Messenger transport. The 24-hour Messenger reply window is enforced again by the API before provider delivery.</p></div></header>
    {error ? <div className="panel"><p>{error}</p></div> : null}
    {loading ? <div className="panel"><p>Loading conversations…</p></div> : null}
    {!loading && rows.length === 0 ? <div className="panel"><p>No Messenger conversations are available yet.</p></div> : null}
    <section className="adminSettingsGrid">
      {rows.map((row) => <article className="panel" key={row.id}>
        <p className="eyebrow">Messenger</p>
        <h3>{row.customer?.contactName || row.customer?.name || 'Unlinked Messenger enquiry'}</h3>
        <p>{row.latestMessage?.contentText || 'Latest event has no text content.'}</p>
        <p><strong>Last inbound:</strong> {row.latestInboundAt ? new Date(row.latestInboundAt).toLocaleString() : 'None'}</p>
        <p><strong>Reply window:</strong> {row.replyEligible ? 'Open' : 'Closed'}</p>
        <textarea
          aria-label="Messenger reply"
          disabled={!row.replyEligible || sendingId === row.id}
          onChange={(event) => setDrafts((current) => ({ ...current, [row.id]: event.target.value }))}
          placeholder={row.replyEligible ? 'Type a reply…' : 'The 24-hour reply window is closed.'}
          rows={4}
          value={drafts[row.id] ?? ''}
        />
        <div><button className="primaryButton" disabled={!row.replyEligible || !drafts[row.id]?.trim() || !!sendingId} onClick={() => void send(row)} type="button">{sendingId === row.id ? 'Sending…' : 'Send reply'}</button></div>
        {success[row.id] ? <p>{success[row.id]}</p> : null}
      </article>)}
    </section>
  </>;
}
