'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, BusinessListOption, CustomerSelectorOption, Property } from '../../lib/api';

const emptyForm = { customerId: '', propertyTypeOptionId: '', name: '', addressLine1: '', addressLine2: '', city: '', province: '', postalCode: '', country: 'South Africa', accessNotes: '' };

export function PropertiesManager() {
  const [items, setItems] = useState<Property[]>([]);
  const [customers, setCustomers] = useState<CustomerSelectorOption[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<BusinessListOption[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      const [propertyData, customerData, typeData] = await Promise.all([api.properties('?page=1&pageSize=100'), api.customerSelectorOptions(customerSearch), api.activeBusinessLists('PROPERTY_TYPE')]);
      setItems(propertyData.items);
      setCustomers(customerData);
      setPropertyTypes(typeData);
      setForm((current) => current.customerId || !customerData[0] ? current : { ...current, customerId: customerData[0].id });
      setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load properties.'); }
  }

  useEffect(() => { const timeout = setTimeout(() => void load(), 200); return () => clearTimeout(timeout); }, [customerSearch]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      if (editingId) await api.updateProperty(editingId, form);
      else await api.createProperty(form);
      setEditingId(null);
      setForm({ ...emptyForm, customerId: customers[0]?.id ?? '' });
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save property.'); }
  }

  function edit(property: Property) {
    setEditingId(property.id);
    setForm({
      customerId: property.customerId, propertyTypeOptionId: property.propertyTypeOptionId ?? '', name: property.name, addressLine1: property.addressLine1,
      addressLine2: property.addressLine2 ?? '', city: property.city, province: property.province ?? '',
      postalCode: property.postalCode ?? '', country: property.country, accessNotes: property.accessNotes ?? '',
    });
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this property?')) return;
    try { await api.deleteProperty(id); await load(); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to delete property.'); }
  }

  return <>
    <header className="pageHeader"><div><p className="eyebrow">Locations</p><h2>Properties</h2><p>Manage customer sites, addresses, and access information.</p></div></header>
    {error ? <p className="errorBanner">{error}</p> : null}
    <div className="resourceGrid">
      <form className="panel resourceForm" onSubmit={submit}>
        <div className="panelHeader"><h3>{editingId ? 'Edit property' : 'New property'}</h3></div>
        <label>Find customer<input type="search" placeholder="Search by customer or contact name" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} /></label>
        <label>Customer<select required aria-describedby="customer-help" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}><option value="">Select a customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.contactName ? `${c.name} — ${c.contactName}` : c.name}</option>)}</select><small id="customer-help">Select the canonical customer record.</small></label>
        <label>Property type<select value={form.propertyTypeOptionId} onChange={(e) => setForm({ ...form, propertyTypeOptionId: e.target.value })}><option value="">Not classified</option>{propertyTypes.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}{editingId && form.propertyTypeOptionId && !propertyTypes.some((option) => option.id === form.propertyTypeOptionId) ? <option value={form.propertyTypeOptionId}>{items.find((item) => item.id === editingId)?.propertyTypeOption?.label ?? 'Inactive property type'} (inactive)</option> : null}</select></label>
        <label>Property name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Address<input required value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} /></label>
        <label>Address line 2<input value={form.addressLine2} onChange={(e) => setForm({ ...form, addressLine2: e.target.value })} /></label>
        <label>City<input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
        <label>Province<input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} /></label>
        <label>Postal code<input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} /></label>
        <label>Access notes<textarea rows={3} value={form.accessNotes} onChange={(e) => setForm({ ...form, accessNotes: e.target.value })} /></label>
        <div className="formActions"><button className="primaryButton">Save property</button>{editingId ? <button type="button" onClick={() => { setEditingId(null); setForm({ ...emptyForm, customerId: customers[0]?.id ?? '' }); }}>Cancel</button> : null}</div>
      </form>
      <section className="panel"><div className="panelHeader"><h3>Property list</h3></div><div className="dataList">
        {items.map((property) => <article className="dataRow" key={property.id}><div><strong>{property.name}</strong>{property.propertyTypeOption ? <span className="statusPill">{property.propertyTypeOption.label}</span> : null}<p>{property.customer?.name ?? 'Customer'} · {property.addressLine1}, {property.city}</p></div><div className="rowActions"><button onClick={() => edit(property)}>Edit</button><button className="dangerButton" onClick={() => void remove(property.id)}>Delete</button></div></article>)}
        {!items.length ? <div className="emptyState"><strong>No properties found</strong><p>Add a customer first, then create a property.</p></div> : null}
      </div></section>
    </div>
  </>;
}
