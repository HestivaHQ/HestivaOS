'use client';

import { useEffect, useRef, useState } from 'react';
import { api, Service } from '../../lib/api';

export function ServicesCatalogue({ initialItems = [] }: { initialItems?: Service[] }) {
  const [items, setItems] = useState<Service[]>(initialItems);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const initialSearch = useRef(true);

  useEffect(() => {
    if (initialSearch.current) { initialSearch.current = false; return; }
    const timer = window.setTimeout(() => {
      api.services(`?page=1&pageSize=100&status=ACTIVE&search=${encodeURIComponent(search)}`)
        .then((data) => { setItems(data.items); setError(''); })
        .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unable to load services.'));
    }, 150);
    return () => window.clearTimeout(timer);
  }, [search]);

  return <>
    <header className="pageHeader"><div><p className="eyebrow">Operations</p><h2>Service catalogue</h2><p>Browse active canonical services and add-ons available for operational planning.</p></div></header>
    {error ? <p className="errorBanner">{error}</p> : null}
    <section className="panel"><div className="panelHeader serviceCatalogueHeader"><h3>Available services</h3><label>Search<input className="searchInput" type="search" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div><div className="dataList">
      {items.map((service) => <article className="dataRow" key={service.id}><div><strong>{service.name}</strong><p>{service.description || 'No operational description'}</p></div><span className="statusPill">{service.type === 'BOTH' ? 'PRIMARY + ADD-ON' : service.type === 'ADD_ON' ? 'ADD-ON' : 'PRIMARY'}</span></article>)}
      {!items.length ? <div className="emptyState"><strong>No active services found</strong><p>Try a different search.</p></div> : null}
    </div></section>
  </>;
}
