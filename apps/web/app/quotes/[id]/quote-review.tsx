'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError, type Property, type QuoteDetail, type QuotePreflight, type QuoteResolutionDecision } from '../../../lib/api';

type Submission = Record<string, any>;
type SubmissionRow = { path: string; label: string; value: string };
type SubmissionSection = { key: string; title: string; description?: string; rows: SubmissionRow[] };
type AttentionReason = { code: string; path?: string; message: string };

const words = (value: unknown) => typeof value === 'string' ? value.toLowerCase().replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase()) : String(value ?? '');
const money = (minor: number, currency: string) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(minor / 100);
const present = (value: unknown) => value !== undefined && value !== null && value !== '';
const decisionText = (decision: QuoteResolutionDecision | null, entity: string) => decision === 'USE_EXISTING' ? `Existing ${entity}` : decision === 'CREATE_NEW' ? `New ${entity} will be created` : `${entity} decision still needed`;

function fieldLabel(key: string) {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
}

function fieldValue(value: unknown) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' && /^[A-Z0-9_]+$/.test(value)) return words(value);
  return String(value);
}

function collectRows(value: unknown, path: string[], rows: SubmissionRow[]) {
  if (!present(value)) return;
  if (Array.isArray(value)) {
    if (value.length === 0) return;
    value.forEach((item, index) => collectRows(item, [...path, `[${index + 1}]`], rows));
    return;
  }
  if (typeof value === 'object' && value !== null) {
    Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
      const nextPath = [...path, key];
      if (key === 'dataBase64' && path.at(-1) === 'transfer') {
        if (present(child)) rows.push({ path: nextPath.join('.').replaceAll('.[', '['), label: 'Uploaded file data', value: 'Captured securely; raw file data is not printed on this page.' });
        return;
      }
      collectRows(child, nextPath, rows);
    });
    return;
  }
  const named = [...path].reverse().find((part) => !part.startsWith('[')) ?? path.at(-1) ?? 'Value';
  rows.push({ path: path.join('.').replaceAll('.[', '['), label: fieldLabel(named), value: fieldValue(value) });
}

function rowsFrom(entries: Array<{ value: unknown; path: string[] }>) {
  const rows: SubmissionRow[] = [];
  entries.forEach((entry) => collectRows(entry.value, entry.path, rows));
  return rows;
}

function requestRemainder(request: Record<string, unknown> | undefined) {
  if (!request) return undefined;
  const excluded = new Set(['primaryService', 'frequency', 'homeCondition', 'ecoFriendlyProducts', 'addOns', 'laundry']);
  return Object.fromEntries(Object.entries(request).filter(([key]) => !excluded.has(key)));
}

function coherentSubmissionSections(submission: Submission): { primary: SubmissionSection[]; technical: SubmissionRow[] } {
  const request = submission.request && typeof submission.request === 'object' ? submission.request as Record<string, unknown> : undefined;
  const sections: SubmissionSection[] = [
    {
      key: 'customer',
      title: '1. Customer & contact',
      rows: rowsFrom([{ value: submission.customer, path: ['customer'] }]),
    },
    {
      key: 'service',
      title: '2. Service requested',
      rows: rowsFrom([
        { value: request?.primaryService, path: ['request', 'primaryService'] },
        { value: request?.frequency, path: ['request', 'frequency'] },
        { value: request?.homeCondition, path: ['request', 'homeCondition'] },
        { value: request?.ecoFriendlyProducts, path: ['request', 'ecoFriendlyProducts'] },
      ]),
    },
    {
      key: 'property',
      title: '3. Property & size',
      rows: rowsFrom([{ value: submission.property, path: ['property'] }]),
    },
    {
      key: 'visit',
      title: '4. Visit & schedule',
      rows: rowsFrom([{ value: submission.visit, path: ['visit'] }]),
    },
    {
      key: 'access',
      title: '5. Access & arrival',
      rows: rowsFrom([{ value: submission.access, path: ['access'] }]),
    },
    {
      key: 'household-safety',
      title: '6. Household, pets & safety',
      rows: rowsFrom([
        { value: submission.household, path: ['household'] },
        { value: submission.safety, path: ['safety'] },
      ]),
    },
    {
      key: 'extras',
      title: '7. Extras, laundry & special requests',
      rows: rowsFrom([
        { value: request?.addOns, path: ['request', 'addOns'] },
        { value: request?.laundry, path: ['request', 'laundry'] },
        { value: requestRemainder(request), path: ['request'] },
      ]),
    },
    {
      key: 'notes',
      title: '8. Customer notes',
      rows: rowsFrom([{ value: submission.notes, path: ['notes'] }]),
    },
    {
      key: 'photo-metadata',
      title: '9. Photo details',
      rows: rowsFrom([{ value: submission.photos, path: ['photos'] }]),
    },
  ].filter((section) => section.rows.length > 0);

  const handled = new Set(['customer', 'request', 'property', 'visit', 'access', 'household', 'safety', 'notes', 'photos', 'schemaVersion', 'submissionId', 'source', 'submittedAt']);
  const otherRows = rowsFrom(Object.entries(submission).filter(([key]) => !handled.has(key)).map(([key, value]) => ({ value, path: [key] })));
  if (otherRows.length) sections.push({ key: 'other', title: 'Other captured details', rows: otherRows });

  const technical = rowsFrom([
    { value: submission.source, path: ['source'] },
    { value: submission.submittedAt, path: ['submittedAt'] },
    { value: submission.submissionId, path: ['submissionId'] },
    { value: submission.schemaVersion, path: ['schemaVersion'] },
  ]);
  return { primary: sections, technical };
}

function attentionReasons(quote: QuoteDetail): AttentionReason[] {
  const latest = [...quote.activities].reverse().find((activity) => activity.type === 'NEEDS_ATTENTION_SET');
  const metadata = (latest as unknown as { metadata?: { reasons?: unknown } } | undefined)?.metadata;
  if (!Array.isArray(metadata?.reasons)) return [];
  return metadata.reasons.filter((reason): reason is AttentionReason => Boolean(reason && typeof reason === 'object' && typeof (reason as AttentionReason).code === 'string' && typeof (reason as AttentionReason).message === 'string'));
}

function reasonAction(reason: AttentionReason) {
  if (reason.code === 'ADD_ON_DETAIL_REQUIRED') return 'Collect the missing size, condition or scope details for this add-on. An Admin revision is required before the price can be finalised.';
  if (reason.code.includes('CAPACITY_REVIEW')) return 'Confirm that the requested quantity fits the available labour and visit time, then record an Admin revision.';
  if (reason.code.includes('COUNT') || reason.code.includes('TYPE_REVIEW') || reason.code.includes('ROOM_CONFIGURATION')) return 'Verify the exact property details with the customer, then record an Admin revision.';
  if (reason.code.includes('FLOOR') || reason.code.includes('ASSESSMENT') || reason.code.includes('SCOPE') || reason.code.includes('WINDOW')) return 'Complete the required assessment or scope details, then record an Admin revision.';
  if (reason.code.includes('BREAK_EVEN') || reason.code.includes('OPERATIONAL')) return 'Resolve the missing operational cost information and recheck the Quote.';
  return 'Review the missing information and create an Admin revision before accepting this Quote.';
}

function activityLabel(type: string, previous: string | null, next: string | null) {
  if (type === 'QUOTE_SUBMITTED') return 'Quote submitted';
  if (type === 'NEEDS_ATTENTION_SET') return 'Review required';
  if (type === 'NEEDS_ATTENTION_CLEARED') return 'Review block cleared';
  if (type === 'MATCH_RESOLUTION_RECORDED') return 'Customer and property decision saved';
  if (type === 'REVISION_CREATED') return 'Quote revision created';
  if (type === 'STATUS_CHANGED' && next === 'ACCEPTED') return 'Quote accepted';
  if (type === 'STATUS_CHANGED' && next === 'DECLINED') return 'Quote declined';
  if (type === 'STATUS_CHANGED') return `Status changed${previous && next ? ` from ${words(previous)} to ${words(next)}` : ''}`;
  return words(type);
}

export function QuoteReview({ quoteId }: { quoteId: string }) {
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [preflight, setPreflight] = useState<QuotePreflight | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [recovery, setRecovery] = useState(false);
  const [customerDecision, setCustomerDecision] = useState<QuoteResolutionDecision>('CREATE_NEW');
  const [customerId, setCustomerId] = useState('');
  const [propertyDecision, setPropertyDecision] = useState<QuoteResolutionDecision>('CREATE_NEW');
  const [propertyId, setPropertyId] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const acceptDialog = useRef<HTMLDialogElement>(null);
  const declineDialog = useRef<HTMLDialogElement>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const detail = await api.quote(quoteId);
      const readiness = await api.quotePreflight(quoteId, detail.currentRevisionNumber);
      setQuote(detail); setPreflight(readiness);
      setCustomerDecision(detail.customerResolution ?? 'CREATE_NEW');
      setCustomerId(detail.customerId ?? detail.resolution.customer.candidates[0]?.id ?? '');
      setPropertyDecision(detail.propertyResolution ?? 'CREATE_NEW');
      setPropertyId(detail.propertyId ?? detail.resolution.property.candidates[0]?.id ?? '');
      const propertyResult = await api.properties('?pageSize=100');
      setProperties(propertyResult.items);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'The Quote could not be loaded.');
    } finally { setLoading(false); }
  }, [quoteId]);

  useEffect(() => { void load(); }, [load]);
  const submission = quote?.currentRevision.structuredData ?? {};
  const submissionSections = useMemo(() => coherentSubmissionSections(submission), [submission]);
  const reviewReasons = useMemo(() => quote ? attentionReasons(quote) : [], [quote]);
  const selectedCustomerProperties = properties.filter((property) => property.customerId === customerId);
  const conflictMessage = (caught: unknown) => caught instanceof ApiError && caught.status === 409 ? 'This Quote changed while you were working. Refresh it and review the latest version before continuing.' : caught instanceof ApiError ? caught.message : 'The request could not be completed because of a network problem.';

  async function saveResolution(event: FormEvent) {
    event.preventDefault(); if (!quote || saving) return; setSaving(true); setError(''); setNotice('');
    try {
      await api.resolveQuote(quote.id, { expectedRevisionNumber: quote.currentRevisionNumber, customer: { decision: customerDecision, ...(customerDecision === 'USE_EXISTING' ? { customerId } : {}) }, property: { decision: propertyDecision, ...(propertyDecision === 'USE_EXISTING' ? { propertyId } : {}) } });
      setNotice('Customer and property decision saved.'); await load();
    } catch (caught) { setError(conflictMessage(caught)); }
    finally { setSaving(false); }
  }

  async function prepareAccept() {
    if (!quote || saving) return; setSaving(true); setError('');
    try {
      const refreshed = await api.quotePreflight(quote.id, quote.currentRevisionNumber); setPreflight(refreshed);
      if (refreshed.currentRevisionNumber !== quote.currentRevisionNumber) { setError('The Quote changed. Refresh it before accepting.'); return; }
      if (!refreshed.eligibleForAcceptance) { setError('This Quote is not ready to accept. Follow the actions in “What needs attention” first.'); return; }
      acceptDialog.current?.showModal();
    } catch (caught) { setError(conflictMessage(caught)); }
    finally { setSaving(false); }
  }

  async function accept() {
    if (!quote || saving) return; setSaving(true); setError(''); setRecovery(false);
    try { await api.acceptQuote(quote.id, quote.currentRevisionNumber); acceptDialog.current?.close(); setNotice('Quote accepted.'); await load(); }
    catch (caught) {
      acceptDialog.current?.close();
      if (caught instanceof ApiError) { setError(conflictMessage(caught)); await load(); }
      else {
        setRecovery(true);
        try {
          const current = await api.quote(quote.id); setQuote(current);
          if (current.status === 'ACCEPTED') setNotice('The connection was uncertain, but HestivaOS confirms the Quote was accepted.');
          else setError(`The result was uncertain. HestivaOS now shows ${words(current.status)}. Refresh before trying again.`);
        } catch { setError('The acceptance result is uncertain and the Quote could not be refreshed. Do not try again until it loads normally.'); }
      }
    } finally { setSaving(false); }
  }

  async function decline(event: FormEvent) {
    event.preventDefault(); if (!quote || saving || !declineReason.trim()) return; setSaving(true); setError('');
    try { await api.declineQuote(quote.id, quote.currentRevisionNumber, declineReason.trim()); declineDialog.current?.close(); setNotice('Quote declined.'); await load(); }
    catch (caught) { setError(conflictMessage(caught)); await load(); }
    finally { setSaving(false); }
  }

  if (loading && !quote) return <p role="status">Loading Quote…</p>;
  if (!quote) return <div className="errorBanner" role="alert">{error || 'Quote unavailable.'}</div>;

  const canDecide = quote.status === 'SUBMITTED' || quote.status === 'NEEDS_ATTENTION';
  const current = quote.currentRevision;
  const actorName = (id: string | null) => quote.actors.find((actor) => actor.id === id)?.displayName ?? quote.actors.find((actor) => actor.id === id)?.firstName ?? (id ? 'Admin user' : 'System');
  const otherBlockers = preflight?.blockers.filter((blocker) => blocker.code !== 'NEEDS_ATTENTION') ?? [];

  return <div className="quoteWorkspace quoteDetail">
    <Link className="backLink" href="/quotes">← Back to Quotes</Link>
    <header className="pageHeader"><div><p className="eyebrow">Quote review</p><h2>{quote.reference}</h2><p>Version <strong>{quote.currentRevisionNumber}</strong></p></div><span className={`statusPill quoteStatus ${quote.status.toLowerCase()}`}>{words(quote.status)}</span></header>
    {error ? <div className="errorBanner" role="alert">{error} <button type="button" onClick={() => void load()}>Refresh</button></div> : null}
    {notice ? <div className="successBanner" role="status">{notice}</div> : null}
    {recovery ? <div className="quoteWarning" role="status"><strong>Acceptance check completed</strong><p>The system did not automatically repeat the acceptance request.</p></div> : null}

    <section className={`quoteReadiness ${preflight?.eligibleForAcceptance ? 'ready' : 'blocked'}`} aria-labelledby="review-status-heading">
      <h3 id="review-status-heading">{preflight?.eligibleForAcceptance ? 'Ready to accept' : 'What needs attention'}</h3>
      {preflight?.eligibleForAcceptance ? <p>All required checks have passed. Review the price and customer/property decisions before accepting.</p> : <>
        {reviewReasons.length ? reviewReasons.map((reason, index) => <article className="quoteWarning" key={`${reason.code}-${reason.path ?? index}`}><strong>{words(reason.code)}</strong><p>{reason.message}</p><p><strong>What to do:</strong> {reasonAction(reason)}</p></article>) : null}
        {otherBlockers.map((blocker) => <article className="quoteWarning" key={blocker.code}><strong>{words(blocker.code)}</strong><p>{blocker.message}</p>{blocker.resolvableInCurrentSlice ? <p><strong>What to do:</strong> Complete the related decision below, save it, then check again.</p> : null}</article>)}
        {!reviewReasons.length && !otherBlockers.length ? <p>This Quote still needs review before it can be accepted.</p> : null}
        <button type="button" disabled={saving || loading} onClick={() => void load()}>{loading ? 'Checking…' : 'Check again'}</button>
      </>}
    </section>

    <section className="panel quoteSection"><div className="panelHeader"><div><h3>Customer request</h3><p>Everything the customer supplied is kept here, but grouped in the order you normally review a cleaning job.</p></div></div>
      {submissionSections.primary.map((section) => <div className="quoteSubmissionGroup" key={section.key}><h4>{section.title}</h4>{section.description ? <p className="helpText">{section.description}</p> : null}<dl className="quoteFacts operationalFacts">{section.rows.map((row) => <div key={row.path}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl></div>)}
      {submissionSections.technical.length ? <details><summary>Technical submission details</summary><dl className="quoteFacts operationalFacts">{submissionSections.technical.map((row) => <div key={row.path}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl></details> : null}
      <details><summary>Field source paths</summary><p className="helpText">These are diagnostic paths for tracing captured website data. They are not part of the normal review.</p><dl className="quoteFacts operationalFacts">{submissionSections.primary.flatMap((section) => section.rows).map((row) => <div key={`path-${row.path}`}><dt>{row.label}</dt><dd><code>{row.path}</code></dd></div>)}</dl></details>
    </section>

    <section className="panel quoteSection"><div className="panelHeader"><div><h3>10. Price breakdown</h3><p>This is the stored price for version {current.revisionNumber}. A Quote marked Needs attention is not final until its review reasons are resolved.</p></div></div><div className="pricingLines">{current.lineItems.map((line) => <div key={line.id}><span>{line.label} {line.quantity > 1 ? `× ${line.quantity}` : ''}</span><strong>{money(line.lineTotalMinor, current.currency)}</strong></div>)}</div><dl className="pricingTotals"><div><dt>Subtotal</dt><dd>{money(current.subtotalMinor, current.currency)}</dd></div>{current.discountMinor ? <div><dt>Discount{current.discountReason ? ` — ${current.discountReason}` : ''}</dt><dd>{money(current.discountMinor, current.currency)}</dd></div> : null}{current.taxEnabled ? <div><dt>Tax</dt><dd>{money(current.taxMinor, current.currency)}</dd></div> : null}<div className="total"><dt>Total</dt><dd>{money(current.totalMinor, current.currency)}</dd></div></dl></section>

    <section className="panel quoteSection"><div className="panelHeader"><div><h3>Customer photos</h3><p>Photos supplied with the Quote. These stay separate from cleaner before/after photos.</p></div></div><div className="quoteEvidence">{quote.photos.filter((photo) => photo.source === 'CUSTOMER').map((photo) => <article key={photo.id}>{photo.url && photo.status === 'STORED' ? <a href={photo.url} target="_blank" rel="noreferrer"><img src={photo.url} alt={photo.originalFileName} /></a> : <div className="photoPlaceholder" aria-label={`${photo.originalFileName}: ${words(photo.status)}`}>No preview</div>}<strong>{photo.originalFileName}</strong><span>{words(photo.status)}</span></article>)}{!quote.photos.some((photo) => photo.source === 'CUSTOMER') ? <p>No customer photos were supplied.</p> : null}</div></section>

    <section className="panel quoteSection"><div className="panelHeader"><h3>11. Customer & property decision</h3></div><p className="helpText">Choose whether this request belongs to an existing customer/property or should create new records when the Quote is accepted.</p>
      <form className="quoteResolutionGrid" onSubmit={saveResolution} aria-label="Customer and property decision">
        <div><h4>Customer</h4><p className="resolutionState">Match result: <strong>{words(quote.resolution.customer.state)}</strong></p><fieldset><legend>Customer decision</legend><label><input type="radio" name="customerDecision" checked={customerDecision === 'USE_EXISTING'} onChange={() => { setCustomerDecision('USE_EXISTING'); setPropertyDecision('CREATE_NEW'); setPropertyId(''); }} /> Use an existing customer</label><label><input type="radio" name="customerDecision" checked={customerDecision === 'CREATE_NEW'} onChange={() => { setCustomerDecision('CREATE_NEW'); setCustomerId(''); setPropertyDecision('CREATE_NEW'); setPropertyId(''); }} /> Create a new customer when accepted</label></fieldset>{customerDecision === 'USE_EXISTING' ? <label className="quoteSelect">Existing customer<select required value={customerId} onChange={(event) => { setCustomerId(event.target.value); setPropertyDecision('CREATE_NEW'); setPropertyId(''); }}><option value="">Choose a customer</option>{quote.resolution.customer.candidates.map((candidate) => <option value={candidate.id} key={candidate.id}>{candidate.displayName}{candidate.context ? ` — ${candidate.context}` : ''}</option>)}</select></label> : <p className="helpText">The submitted customer details will create a new customer. Existing records are not overwritten.</p>}</div>
        <div><h4>Property</h4><p className="resolutionState">Match result: <strong>{words(quote.resolution.property.state)}</strong></p><fieldset><legend>Property decision</legend><label><input type="radio" name="propertyDecision" checked={propertyDecision === 'USE_EXISTING'} disabled={customerDecision !== 'USE_EXISTING' || !customerId} onChange={() => setPropertyDecision('USE_EXISTING')} /> Use an existing property</label><label><input type="radio" name="propertyDecision" checked={propertyDecision === 'CREATE_NEW'} onChange={() => { setPropertyDecision('CREATE_NEW'); setPropertyId(''); }} /> Create a new property when accepted</label></fieldset>{propertyDecision === 'USE_EXISTING' ? <label className="quoteSelect">Property<select required value={propertyId} onChange={(event) => setPropertyId(event.target.value)}><option value="">Choose a property</option>{selectedCustomerProperties.map((property) => <option value={property.id} key={property.id}>{property.name} — {property.addressLine1}, {property.city}</option>)}</select></label> : <p className="helpText">The submitted property details will create a new property. Visit-specific access information stays with the job.</p>}</div>
        <div className="quoteDecisionActions"><button className="primaryButton" disabled={saving || (customerDecision === 'USE_EXISTING' && !customerId) || (propertyDecision === 'USE_EXISTING' && (!propertyId || !selectedCustomerProperties.some((item) => item.id === propertyId)))}>{saving ? 'Saving…' : 'Save customer & property decision'}</button></div>
      </form>
    </section>

    <section className="panel quoteSection"><div className="panelHeader"><h3>Activity</h3></div><ol className="quoteTimeline">{quote.activities.map((activity) => <li key={activity.id}><strong>{activityLabel(activity.type, activity.previousStatus, activity.newStatus)}</strong><p>{actorName(activity.actorUserId)} · <time dateTime={activity.createdAt}>{new Date(activity.createdAt).toLocaleString('en-ZA')}</time></p>{activity.note ? <p>{activity.note}</p> : null}</li>)}</ol></section>

    {quote.status === 'ACCEPTED' ? <section className="panel quoteAccepted"><h3>Accepted records</h3><p>Accepted by {actorName(quote.acceptedByUserId)}{quote.acceptedAt ? ` on ${new Date(quote.acceptedAt).toLocaleString('en-ZA')}` : ''}.</p><div className="rowActions">{quote.customerId ? <Link href={`/customers?customerId=${quote.customerId}`}>View customer</Link> : null}{quote.propertyId ? <Link href={`/properties?propertyId=${quote.propertyId}`}>View property</Link> : null}{quote.recurringAgreementId ? <Link href={`/recurring-services?agreementId=${quote.recurringAgreementId}`}>View recurring service</Link> : null}{quote.workOrderId ? <Link className="primaryButton" href={`/work-orders/${quote.workOrderId}`}>View work order</Link> : null}</div></section> : null}

    {canDecide ? <section className="panel quoteDecision"><div><h3>Accept or decline</h3><p>This decision applies to version {quote.currentRevisionNumber}.</p></div><div className="quoteDecisionActions"><button type="button" className="dangerButton" disabled={saving} onClick={() => declineDialog.current?.showModal()}>Decline</button><button type="button" className="primaryButton" disabled={saving || !preflight?.eligibleForAcceptance} onClick={() => void prepareAccept()}>Review acceptance</button></div></section> : null}

    <dialog ref={acceptDialog} className="quoteDialog" aria-labelledby="accept-title"><h3 id="accept-title">Accept {quote.reference}?</h3><dl><div><dt>Customer</dt><dd>{decisionText(quote.customerResolution, 'customer')}</dd></div><div><dt>Property</dt><dd>{decisionText(quote.propertyResolution, 'property')}</dd></div><div><dt>Service</dt><dd>{submission.request?.primaryService?.canonicalService ?? submission.request?.primaryService?.websiteValue}</dd></div><div><dt>Preferred date</dt><dd>{submission.visit?.preferredDate}</dd></div><div><dt>Total</dt><dd>{money(current.totalMinor, current.currency)}</dd></div></dl><p><strong>{submission.request?.frequency === 'ONE_TIME' ? 'This creates one work order.' : 'This creates a recurring service and its first work order.'}</strong></p><div className="dialogActions"><button type="button" onClick={() => acceptDialog.current?.close()}>Cancel</button><button type="button" className="primaryButton" disabled={saving} onClick={() => void accept()}>{saving ? 'Accepting…' : 'Accept Quote'}</button></div></dialog>
    <dialog ref={declineDialog} className="quoteDialog" aria-labelledby="decline-title"><form onSubmit={decline}><h3 id="decline-title">Decline {quote.reference}?</h3><p>This decision applies to version {quote.currentRevisionNumber}.</p><label>Reason<textarea required minLength={3} maxLength={500} rows={4} value={declineReason} onChange={(event) => setDeclineReason(event.target.value)} /></label><div className="dialogActions"><button type="button" onClick={() => declineDialog.current?.close()}>Cancel</button><button className="dangerButton" disabled={saving || declineReason.trim().length < 3}>{saving ? 'Declining…' : 'Decline Quote'}</button></div></form></dialog>
  </div>;
}
