'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError, Customer } from '../../lib/api';
import { displayCustomerName } from '../../lib/customer-display';

type CustomerForm = { contactName: string; email: string; phone: string; notes: string; status: Customer['status'] };
const emptyForm: CustomerForm = { contactName: '', email: '', phone: '', notes: '', status: 'ACTIVE' };

export function CustomersManager({ ownerId }: { ownerId: string }) {
  const [items, setItems] = useState<Customer[]>([]);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const query = debouncedSearch.trim() ? `?page=1&pageSize=100&search=${encodeURIComponent(debouncedSearch.trim())}` : '?page=1&pageSize=100';
      setItems((await api.customers(query)).items);
      setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load customers.'); }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => { void load(); }, [debouncedSearch]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      if (editingId) await api.updateCustomer(editingId, form);
      else {
        const customer = await api.createCustomer({ ownerId, ...form });
        if (!customer?.id || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(customer.id)) {
          throw new Error('Customer was saved, but its identifier was missing or invalid. Open Properties to continue safely.');
        }
        // Use a document navigation because the previous soft-router transition
        // did not reliably continue in the deployed OpenNext build.
        window.location.assign(`/properties?mode=create&customerId=${encodeURIComponent(customer.id)}`);
        return;
      }
      setForm(emptyForm); setEditingId(null); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save customer.'); }
    finally { setBusy(false); }
  }

  function edit(customer: Customer) {
    setEditingId(customer.id);
    setForm({ contactName: displayCustomerName(customer), email: customer.email ?? '', phone: customer.phone ?? '', notes: customer.notes ?? '', status: customer.status });
  }

  async function remove(id: string) {
    if (!window.confirm('Permanently delete this customer? Linked operational records will prevent deletion.')) return;
    try { await api.deleteCustomer(id); await load(); }
    catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 409)) setError(`Action denied. ${err.message}`);
      else if (err instanceof ApiError && err.status === 400) setError(`Validation failed. ${err.message}`);
      else if (err instanceof ApiError) setError('Unexpected server failure. Please try again.');
      else setError('Network failure. Check your connection and try again.');
    }
  }

  return <>
    <header className="pageHeader"><div><p className="eyebrow">Directory</p><h2>Customers</h2><p>Create, update, search, and manage customer records.</p></div></header>
    {error ? <p className="errorBanner">{error}</p> : null}
    <div className="resourceGrid">
      <form className="panel resourceForm" onSubmit={submit}>
        <div className="panelHeader"><h3>{editingId ? 'Edit customer' : 'New customer'}</h3></div>
        <label>Contact name<input required value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></label>
        <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Customer['status'] })}><option>ACTIVE</option><option>INACTIVE</option></select></label>
        <label>Notes<textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
        <div className="formActions"><button className="primaryButton" disabled={busy}>{busy ? 'Saving…' : 'Save customer'}</button>{editingId ? <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</button> : null}</div>
      </form>
      <section className="panel"><div className="panelHeader"><h3>Customer list</h3><input className="searchInput" placeholder="Search customers" value={search} onChange={(e) => setSearch(e.target.value)} /></div><div className="dataList">
        {items.map((customer) => <article className="dataRow" key={customer.id}><div><strong>{displayCustomerName(customer)}</strong><p>{customer.email || customer.phone || 'No contact details'}</p></div><div className="rowActions"><span className="statusPill">{customer.status}</span><button onClick={() => edit(customer)}>Edit</button><button className="dangerButton" onClick={() => void remove(customer.id)}>Delete</button></div></article>)}
        {!items.length ? <div className="emptyState"><strong>No customers found</strong><p>Add the first customer using the form.</p></div> : null}
      </div></section>
    </div>
  </>;
}
