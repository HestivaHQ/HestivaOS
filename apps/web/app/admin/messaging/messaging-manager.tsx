'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../../../lib/supabase/client';
import {
  createMessagingCustomer,
  createMessagingCustomerContact,
  messagingConversations,
  messagingCustomerContacts,
  messagingCustomerOptions,
  sendManualMessengerReply,
  trustMessagingIdentity,
  type MessagingConversationSummary,
  type MessagingCustomerContact,
  type MessagingCustomerOption,
} from '../../../lib/messaging-api';

type NewCustomerDraft = { accountType: 'INDIVIDUAL' | 'ORGANISATION'; accountName: string; contactName: string; email: string; phone: string };
const emptyCustomer: NewCustomerDraft = { accountType: 'INDIVIDUAL', accountName: '', contactName: '', email: '', phone: '' };

export function MessagingManager({ ownerId }: { ownerId: string }) {
  const [rows, setRows] = useState<MessagingConversationSummary[]>([]);
  const [customers, setCustomers] = useState<MessagingCustomerOption[]>([]);
  const [contacts, setContacts] = useState<Record<string, MessagingCustomerContact[]>>({});
  const [selectedCustomer, setSelectedCustomer] = useState<Record<string, string>>({});
  const [selectedContact, setSelectedContact] = useState<Record<string, string>>({});
  const [newContactName, setNewContactName] = useState<Record<string, string>>({});
  const [newCustomers, setNewCustomers] = useState<Record<string, NewCustomerDraft>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<Record<string, string>>({});

  async function accessToken() {
    const { data: { session } } = await createClient().auth.getSession();
    if (!session?.access_token) throw new Error('Authenticated session is required.');
    return session.access_token;
  }

  async function loadContacts(rowId: string, customerId: string, token?: string) {
    const access = token ?? await accessToken();
    const found = (await messagingCustomerContacts(access, customerId)).filter((contact) => contact.status === 'ACTIVE');
    setContacts((current) => ({ ...current, [rowId]: found }));
    setSelectedContact((current) => ({ ...current, [rowId]: found[0]?.id ?? '' }));
  }

  async function refresh() {
    setLoading(true); setError(null);
    try {
      const token = await accessToken();
      const [conversationRows, customerRows] = await Promise.all([messagingConversations(token), messagingCustomerOptions(token)]);
      setRows(conversationRows); setCustomers(customerRows);
      const initial: Record<string, string> = {};
      for (const row of conversationRows) if (row.customerId) initial[row.id] = row.customerId;
      setSelectedCustomer((current) => ({ ...initial, ...current }));
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load messaging conversations.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void refresh(); }, []);

  async function chooseCustomer(rowId: string, customerId: string) {
    setSelectedCustomer((current) => ({ ...current, [rowId]: customerId }));
    setSelectedContact((current) => ({ ...current, [rowId]: '' }));
    if (!customerId) return;
    try { await loadContacts(rowId, customerId); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load customer contacts.'); }
  }

  async function addContact(rowId: string) {
    const customerId = selectedCustomer[rowId]; const name = newContactName[rowId]?.trim();
    if (!customerId || !name || busyId) return;
    setBusyId(rowId); setError(null);
    try {
      const token = await accessToken();
      const created = await createMessagingCustomerContact(token, customerId, { name });
      await loadContacts(rowId, customerId, token);
      setSelectedContact((current) => ({ ...current, [rowId]: created.id }));
      setNewContactName((current) => ({ ...current, [rowId]: '' }));
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to create contact.'); }
    finally { setBusyId(null); }
  }

  async function addCustomer(rowId: string) {
    const draft = newCustomers[rowId] ?? emptyCustomer;
    if (!draft.contactName.trim() || (draft.accountType === 'ORGANISATION' && !draft.accountName.trim()) || busyId) return;
    setBusyId(rowId); setError(null);
    try {
      const token = await accessToken();
      const created = await createMessagingCustomer(token, {
        ownerId,
        accountType: draft.accountType,
        ...(draft.accountType === 'ORGANISATION' ? { name: draft.accountName.trim() } : {}),
        contactName: draft.contactName.trim(), email: draft.email.trim(), phone: draft.phone.trim(),
      });
      setCustomers((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedCustomer((current) => ({ ...current, [rowId]: created.id }));
      await loadContacts(rowId, created.id, token);
      setNewCustomers((current) => ({ ...current, [rowId]: emptyCustomer }));
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to create customer.'); }
    finally { setBusyId(null); }
  }

  async function trust(row: MessagingConversationSummary) {
    const contactId = selectedContact[row.id];
    if (!contactId || busyId) return;
    if (!window.confirm('Trust this exact messaging identity for the selected customer contact? Future inbound messages from this identity may resolve to that customer.')) return;
    setBusyId(row.id); setError(null);
    try {
      const token = await accessToken();
      await trustMessagingIdentity(token, row.id, contactId);
      setSuccess((current) => ({ ...current, [row.id]: 'Identity trusted and linked.' }));
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to trust messaging identity.'); }
    finally { setBusyId(null); }
  }

  async function send(row: MessagingConversationSummary) {
    const text = drafts[row.id]?.trim(); if (!text || busyId) return;
    setBusyId(row.id); setError(null);
    try {
      const token = await accessToken();
      const result = await sendManualMessengerReply(token, row.id, { requestId: crypto.randomUUID(), text });
      setDrafts((current) => ({ ...current, [row.id]: '' }));
      setSuccess((current) => ({ ...current, [row.id]: `Accepted by Messenger at ${new Date(result.acceptedAt).toLocaleString()}.` }));
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to send Messenger reply.'); }
    finally { setBusyId(null); }
  }

  return <>
    <header className="pageHeader"><div><p className="eyebrow">Messaging</p><h2>Customer identity review</h2><p>Review WhatsApp and Messenger enquiries. Identity trust is established only by an explicit administrator action; inbound messages never self-authorize.</p></div></header>
    {error ? <div className="panel"><p>{error}</p></div> : null}
    {loading ? <div className="panel"><p>Loading conversations…</p></div> : null}
    {!loading && rows.length === 0 ? <div className="panel"><p>No messaging conversations are available yet.</p></div> : null}
    <section className="adminSettingsGrid">
      {rows.map((row) => {
        const reviewable = row.identityReview.state === 'UNLINKED' || row.identityReview.state === 'UNVERIFIED';
        const customerId = selectedCustomer[row.id] ?? row.customerId ?? '';
        const customerContacts = contacts[row.id] ?? [];
        const customerDraft = newCustomers[row.id] ?? emptyCustomer;
        return <article className="panel" key={row.id}>
          <p className="eyebrow">{row.channel}</p>
          <h3>{row.customer?.contactName || row.customer?.name || `Unlinked ${row.channel.toLowerCase()} enquiry`}</h3>
          <p>{row.latestMessage?.contentText || 'Latest inbound event has no text content.'}</p>
          <p><strong>Identity review:</strong> {row.identityReview.state}</p>
          {row.identityReview.contact ? <p><strong>Trusted contact:</strong> {row.identityReview.contact.name}</p> : null}
          <p><strong>Last inbound:</strong> {row.latestInboundAt ? new Date(row.latestInboundAt).toLocaleString() : 'None'}</p>

          {reviewable ? <div className="resourceForm">
            <label>Customer<select value={customerId} onChange={(event) => void chooseCustomer(row.id, event.target.value)}><option value="">Select customer…</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.contactName && customer.contactName !== customer.name ? ` — ${customer.contactName}` : ''}</option>)}</select></label>
            {customerId ? <>
              <label>Contact<select value={selectedContact[row.id] ?? ''} onChange={(event) => setSelectedContact((current) => ({ ...current, [row.id]: event.target.value }))}><option value="">Select contact…</option>{customerContacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}{contact.isPrimary ? ' — primary' : ''}</option>)}</select></label>
              <label>New contact<input placeholder="Contact name" value={newContactName[row.id] ?? ''} onChange={(event) => setNewContactName((current) => ({ ...current, [row.id]: event.target.value }))} /></label>
              <button disabled={busyId === row.id || !newContactName[row.id]?.trim()} onClick={() => void addContact(row.id)} type="button">Add contact</button>
              <button className="primaryButton" disabled={busyId === row.id || !selectedContact[row.id]} onClick={() => void trust(row)} type="button">Trust selected identity</button>
            </> : <>
              <label>Account type<select value={customerDraft.accountType} onChange={(event) => setNewCustomers((current) => ({ ...current, [row.id]: { ...customerDraft, accountType: event.target.value as NewCustomerDraft['accountType'] } }))}><option value="INDIVIDUAL">Individual</option><option value="ORGANISATION">Organisation</option></select></label>
              {customerDraft.accountType === 'ORGANISATION' ? <label>Organisation name<input value={customerDraft.accountName} onChange={(event) => setNewCustomers((current) => ({ ...current, [row.id]: { ...customerDraft, accountName: event.target.value } }))} /></label> : null}
              <label>Contact name<input value={customerDraft.contactName} onChange={(event) => setNewCustomers((current) => ({ ...current, [row.id]: { ...customerDraft, contactName: event.target.value } }))} /></label>
              <label>Email<input type="email" value={customerDraft.email} onChange={(event) => setNewCustomers((current) => ({ ...current, [row.id]: { ...customerDraft, email: event.target.value } }))} /></label>
              <label>Phone<input value={customerDraft.phone} onChange={(event) => setNewCustomers((current) => ({ ...current, [row.id]: { ...customerDraft, phone: event.target.value } }))} /></label>
              <button disabled={busyId === row.id || !customerDraft.contactName.trim() || (customerDraft.accountType === 'ORGANISATION' && !customerDraft.accountName.trim())} onClick={() => void addCustomer(row.id)} type="button">Create customer</button>
            </>}
          </div> : null}

          {row.channel === 'MESSENGER' ? <>
            <p><strong>Reply window:</strong> {row.replyEligible ? 'Open' : 'Closed'}</p>
            <textarea aria-label="Messenger reply" disabled={!row.replyEligible || busyId === row.id} onChange={(event) => setDrafts((current) => ({ ...current, [row.id]: event.target.value }))} placeholder={row.replyEligible ? 'Type a reply…' : 'The 24-hour reply window is closed.'} rows={4} value={drafts[row.id] ?? ''} />
            <div><button className="primaryButton" disabled={!row.replyEligible || !drafts[row.id]?.trim() || !!busyId} onClick={() => void send(row)} type="button">{busyId === row.id ? 'Working…' : 'Send reply'}</button></div>
          </> : <p>WhatsApp is inbound-only in this operational slice.</p>}
          {success[row.id] ? <p>{success[row.id]}</p> : null}
        </article>;
      })}
    </section>
  </>;
}
