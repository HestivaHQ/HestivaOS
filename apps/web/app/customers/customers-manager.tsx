'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, Customer } from '../../lib/api';

type CustomerForm = { name: string; contactName: string; email: string; phone: string; notes: string; status: Customer['status'] };
const emptyForm: CustomerForm = { name: '', contactName: '', email: '', phone: '', notes: '', status: 'ACTIVE' };

export function CustomersManager({ ownerId }: { ownerId: string }) {
  const [items, setItems] = useState<Customer[]>([]);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const query = search.trim() ? `?page=1&pageSize=100&search=${encodeURIComponent(search.trim())}` : '?page=1&pageSize=100';
      setItems((await api.customers(query)).items);
      setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load customers.'); }
  }

  useEffect(() => { void load(); }, [search]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      if (editingId) await api.updateCustomer(editingId, form);
      else await api.createCustomer({ ownerId, ...form });
      setForm(emptyForm); setEditingId(null); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save customer.'); }
    finally { setBusy(false); }
  }

  function edit(customer: Customer) {
    setEditingId(customer.id);
    setForm({ name: customer.name, contactName: customer.contactName ?? '', email: customer.email ?? '', phone: customer.phone ?? '', notes: customer.notes ?? '', status: customer.status });
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this customer and its properties?')) return;
    try { await api.deleteCustomer(id); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to delete customer.'); }
  }

  return <>
    <header className="pageHeader"><div><p className="eyebrow">Directory</p><h2>Customers</h2><p>Create, update, search, and manage customer records.</p></div></header>
    {error ? <p className="errorBanner">{error}</p> : null}
    <div className="resourceGrid">
      <form className="panel resourceForm" onSubmit={submit}>
        <div className="panelHeader"><h3>{editingId ? 'Edit customer' : 'New customer'}</h3></div>
        <label>Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Contact name<input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></label>
        <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Customer['status'] })}><option>ACTIVE</option><option>INACTIVE</option></select></label>
        <label>Notes<textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
        <div className="formActions"><button className="primaryButton" disabled={busy}>{busy ? 'Saving…' : 'Save customer'}</button>{editingId ? <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</button> : null}</div>
      </form>
      <section className="panel"><div className="panelHeader"><h3>Customer list</h3><input className="searchInput" placeholder="Search customers" value={search} onChange={(e) => setSearch(e.target.value)} /></div><div className="dataList">
        {items.map((customer) => <article className="dataRow" key={customer.id}><div><strong>{customer.name}</strong><p>{customer.contactName || 'No contact'} · {customer.email || customer.phone || 'No contact details'}</p></div><div className="rowActions"><span className="statusPill">{customer.status}</span><button onClick={() => edit(customer)}>Edit</button><button className="dangerButton" onClick={() => void remove(customer.id)}>Delete</button></div></article>)}
        {!items.length ? <div className="emptyState"><strong>No customers found</strong><p>Add the first customer using the form.</p></div> : null}
      </div></section>
    </div>
  </>;
}
