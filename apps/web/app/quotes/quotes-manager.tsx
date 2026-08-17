'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, ApiError, type QuoteListItem, type QuoteStatus } from '../../lib/api';

const filters: Array<{ label: string; value: '' | QuoteStatus }> = [
  { label: 'Actionable', value: '' }, { label: 'Needs review', value: 'NEEDS_ATTENTION' },
  { label: 'Submitted', value: 'SUBMITTED' }, { label: 'Accepted', value: 'ACCEPTED' },
  { label: 'Declined', value: 'DECLINED' }, { label: 'Expired', value: 'EXPIRED' },
];
const words = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());

export function QuotesManager() {
  const [items, setItems] = useState<QuoteListItem[]>([]);
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [status, setStatus] = useState<'' | QuoteStatus>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ pageSize: '100' });
      if (submittedSearch) params.set('search', submittedSearch);
      if (status) params.set('status', status);
      const result = await api.quotes(`?${params}`);
      const ordered = status || submittedSearch ? result.items : [...result.items].sort((a, b) => {
        const priority = (item: QuoteListItem) => item.status === 'NEEDS_ATTENTION' ? 0 : item.status === 'SUBMITTED' ? 1 : 2;
        return priority(a) - priority(b) || Date.parse(b.createdAt) - Date.parse(a.createdAt);
      });
      setItems(ordered);
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Quotes could not be loaded.'); }
    finally { setLoading(false); }
  }, [status, submittedSearch]);
  useEffect(() => { void load(); }, [load]);
  const submitSearch = (event: FormEvent) => { event.preventDefault(); setSubmittedSearch(search.trim()); };
  return <div className="quoteWorkspace">
    <header className="pageHeader"><div><p className="eyebrow">Administration</p><h2>Quotes</h2><p>Review customer requests and make revision-safe decisions.</p></div></header>
    <section className="panel quoteQueue" aria-labelledby="quote-queue-heading">
      <div className="panelHeader"><div><h3 id="quote-queue-heading">Quote queue</h3><p>Actionable requests appear first.</p></div></div>
      <form className="quoteFilters" role="search" onSubmit={submitSearch}>
        <label>Search references<input className="searchInput" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Q-…" /></label>
        <button type="submit">Search</button>
      </form>
      <div className="quoteFilterTabs" aria-label="Quote status filters">{filters.map((filter) => <button key={filter.label} type="button" className={status === filter.value ? 'active' : ''} aria-pressed={status === filter.value} onClick={() => setStatus(filter.value)}>{filter.label}</button>)}</div>
      {error ? <div className="errorBanner" role="alert">{error} <button type="button" onClick={() => void load()}>Try again</button></div> : null}
      {loading ? <p className="quoteLoading" role="status">Loading Quotes…</p> : <div className="quoteList">
        {items.map((quote) => <Link className="quoteQueueCard" href={`/quotes/${quote.id}`} key={quote.id}>
          <div className="quoteQueueIdentity"><strong>{quote.reference}</strong><span className={`statusPill quoteStatus ${quote.status.toLowerCase()}`}>{words(quote.status)}</span></div>
          <div><strong>{quote.summary?.customerName ?? 'Customer details unavailable'}</strong><p>{quote.summary ? `${quote.summary.customerEmail} · ${quote.summary.customerMobile}` : 'Open to review the current revision.'}</p></div>
          <dl><div><dt>Service</dt><dd>{quote.summary?.primaryService ?? 'Review required'}</dd></div><div><dt>Frequency</dt><dd>{quote.summary ? words(quote.summary.frequency) : '—'}</dd></div><div><dt>Preferred date</dt><dd>{quote.summary?.preferredDate ?? '—'}</dd></div><div><dt>Revision</dt><dd>{quote.currentRevisionNumber}</dd></div></dl>
          <div className="quoteQueueMeta"><strong>{quote.status === 'NEEDS_ATTENTION' ? 'Review required' : quote.status === 'SUBMITTED' ? 'Check readiness' : 'Historical record'}</strong><time dateTime={quote.summary?.submittedAt ?? quote.createdAt}>{new Date(quote.summary?.submittedAt ?? quote.createdAt).toLocaleString('en-ZA')}</time></div>
        </Link>)}
        {!items.length ? <div className="emptyState"><strong>No Quotes found</strong><p>Adjust the search or status filter.</p></div> : null}
      </div>}
    </section>
  </div>;
}
