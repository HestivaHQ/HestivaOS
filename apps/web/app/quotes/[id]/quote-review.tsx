'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError, type Property, type QuoteDetail, type QuotePreflight, type QuoteResolutionDecision } from '../../../lib/api';

type Submission = Record<string, any>;
const words = (value: unknown) => typeof value === 'string' ? value.toLowerCase().replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase()) : String(value ?? '');
const money = (minor: number, currency: string) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(minor / 100);
const present = (value: unknown) => value !== undefined && value !== null && value !== '';
const decisionText = (decision: QuoteResolutionDecision | null, entity: string) => decision === 'USE_EXISTING' ? `Existing ${entity}` : decision === 'CREATE_NEW' ? `New ${entity} will be created` : `Unresolved ${entity}`;

function operationalRows(submission: Submission) {
  const request = submission.request ?? {}; const visit = submission.visit ?? {}; const property = submission.property ?? {}; const access = submission.access ?? {}; const safety = submission.safety ?? {}; const notes = submission.notes ?? {};
  const rows: Array<[string, unknown]> = [
    ['Service', request.primaryService?.canonicalService ?? request.primaryService?.websiteValue], ['Frequency', words(request.frequency)],
    ['Preferred date', visit.preferredDate], ['Alternative date', visit.alternativeDate], ['Preferred time', words(visit.preferredTime)],
    ['Flexibility', visit.flexibility], ['Urgency', visit.urgency], ['Exact floor', property.exactFloor], ['Building access', words(property.buildingAccess)],
    ['Complex access', words(access.complexAccess)], ['Access instructions', access.securityInstructions], ['Parking', access.parking],
    ['Key handover', words(access.keyHandover)], ['Key handover details', access.keyHandoverDetails], ['Someone present', present(access.someonePresent) ? (access.someonePresent ? 'Yes' : 'No') : null],
    ['Eco-friendly products', request.ecoFriendlyProducts ? 'Requested' : null], ['Customer-declared existing damage', safety.existingDamage],
    ['Recurring instructions', visit.recurringNotes], ['Attention areas', notes.attentionAreas], ['Renovation dust', notes.renovationDust], ['Appliance notes', notes.applianceNotes], ['Additional notes', notes.additionalNotes],
    ['Laundry loads', request.laundry?.laundryLoads], ['Ironing loads', request.laundry?.ironingLoads],
  ];
  return rows.filter(([, value]) => present(value));
}

function activityLabel(type: string, previous: string | null, next: string | null) {
  if (type === 'QUOTE_SUBMITTED') return 'Quote submitted';
  if (type === 'MATCH_RESOLUTION_RECORDED') return 'Customer and Property resolution selected';
  if (type === 'STATUS_CHANGED' && next === 'ACCEPTED') return 'Quote accepted';
  if (type === 'STATUS_CHANGED' && next === 'DECLINED') return 'Quote declined';
  if (type === 'STATUS_CHANGED') return `Status changed${previous && next ? ` from ${words(previous)} to ${words(next)}` : ''}`;
  return words(type);
}

export function QuoteReview({ quoteId }: { quoteId: string }) {
  const [quote, setQuote] = useState<QuoteDetail | null>(null); const [preflight, setPreflight] = useState<QuotePreflight | null>(null);
  const [properties, setProperties] = useState<Property[]>([]); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [recovery, setRecovery] = useState(false);
  const [customerDecision, setCustomerDecision] = useState<QuoteResolutionDecision>('CREATE_NEW'); const [customerId, setCustomerId] = useState('');
  const [propertyDecision, setPropertyDecision] = useState<QuoteResolutionDecision>('CREATE_NEW'); const [propertyId, setPropertyId] = useState(''); const [declineReason, setDeclineReason] = useState('');
  const acceptDialog = useRef<HTMLDialogElement>(null); const declineDialog = useRef<HTMLDialogElement>(null);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const detail = await api.quote(quoteId); const readiness = await api.quotePreflight(quoteId, detail.currentRevisionNumber);
      setQuote(detail); setPreflight(readiness); setCustomerDecision(detail.customerResolution ?? 'CREATE_NEW'); setCustomerId(detail.customerId ?? detail.resolution.customer.candidates[0]?.id ?? '');
      setPropertyDecision(detail.propertyResolution ?? 'CREATE_NEW'); setPropertyId(detail.propertyId ?? detail.resolution.property.candidates[0]?.id ?? '');
      const propertyResult = await api.properties('?pageSize=100'); setProperties(propertyResult.items);
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'The Quote could not be loaded.'); }
    finally { setLoading(false); }
  }, [quoteId]);
  useEffect(() => { void load(); }, [load]);
  const submission = quote?.currentRevision.structuredData ?? {}; const rows = useMemo(() => operationalRows(submission), [submission]);
  const selectedCustomerProperties = properties.filter((property) => property.customerId === customerId);
  const conflictMessage = (caught: unknown) => caught instanceof ApiError && caught.status === 409 ? 'This Quote changed or another decision was recorded. Refresh and review the current revision before continuing.' : caught instanceof ApiError ? caught.message : 'The request could not be completed because of a network failure.';

  async function saveResolution(event: FormEvent) {
    event.preventDefault(); if (!quote || saving) return; setSaving(true); setError(''); setNotice('');
    try {
      await api.resolveQuote(quote.id, { expectedRevisionNumber: quote.currentRevisionNumber, customer: { decision: customerDecision, ...(customerDecision === 'USE_EXISTING' ? { customerId } : {}) }, property: { decision: propertyDecision, ...(propertyDecision === 'USE_EXISTING' ? { propertyId } : {}) } });
      setNotice('Customer and Property resolution recorded.'); await load();
    } catch (caught) { setError(conflictMessage(caught)); }
    finally { setSaving(false); }
  }
  async function prepareAccept() {
    if (!quote || saving) return; setSaving(true); setError('');
    try {
      const refreshed = await api.quotePreflight(quote.id, quote.currentRevisionNumber); setPreflight(refreshed);
      if (refreshed.currentRevisionNumber !== quote.currentRevisionNumber) { setError('The Quote revision changed. Refresh and review it before accepting.'); return; }
      if (!refreshed.eligibleForAcceptance) { setError('Acceptance is blocked. Review the blocker summary at the top of the page.'); return; }
      acceptDialog.current?.showModal();
    } catch (caught) { setError(conflictMessage(caught)); } finally { setSaving(false); }
  }
  async function accept() {
    if (!quote || saving) return; setSaving(true); setError(''); setRecovery(false);
    try { await api.acceptQuote(quote.id, quote.currentRevisionNumber); acceptDialog.current?.close(); setNotice('Quote accepted.'); await load(); }
    catch (caught) {
      acceptDialog.current?.close();
      if (caught instanceof ApiError) { setError(conflictMessage(caught)); await load(); }
      else {
        setRecovery(true);
        try { const current = await api.quote(quote.id); setQuote(current); if (current.status === 'ACCEPTED') setNotice('The network result was uncertain, but the backend confirms this Quote was accepted.'); else if (current.status === 'SUBMITTED') setError('The result was uncertain. The backend still shows Submitted; review readiness before retrying.'); else setError(`The result was uncertain. The backend now reports ${words(current.status)}.`); }
        catch { setError('The acceptance result is uncertain and backend state could not be refreshed. Do not retry until the Quote can be reloaded.'); }
      }
    } finally { setSaving(false); }
  }
  async function decline(event: FormEvent) {
    event.preventDefault(); if (!quote || saving || !declineReason.trim()) return; setSaving(true); setError('');
    try { await api.declineQuote(quote.id, quote.currentRevisionNumber, declineReason.trim()); declineDialog.current?.close(); setNotice('Quote declined.'); await load(); }
    catch (caught) { setError(conflictMessage(caught)); await load(); } finally { setSaving(false); }
  }
  if (loading && !quote) return <p role="status">Loading Quote…</p>;
  if (!quote) return <div className="errorBanner" role="alert">{error || 'Quote unavailable.'}</div>;
  const canDecide = quote.status === 'SUBMITTED' || quote.status === 'NEEDS_ATTENTION'; const current = quote.currentRevision;
  const actorName = (id: string | null) => quote.actors.find((actor) => actor.id === id)?.displayName ?? quote.actors.find((actor) => actor.id === id)?.firstName ?? (id ? 'Admin user' : 'System');
  return <div className="quoteWorkspace quoteDetail">
    <Link className="backLink" href="/quotes">← Back to Quote queue</Link>
    <header className="pageHeader"><div><p className="eyebrow">Admin Quote review</p><h2>{quote.reference}</h2><p>Current revision: <strong>{quote.currentRevisionNumber}</strong></p></div><span className={`statusPill quoteStatus ${quote.status.toLowerCase()}`}>{words(quote.status)}</span></header>
    {error ? <div className="errorBanner" role="alert">{error} <button type="button" onClick={() => void load()}>Refresh Quote</button></div> : null}
    {notice ? <div className="successBanner" role="status">{notice}</div> : null}
    {recovery ? <div className="quoteWarning" role="status"><strong>Acceptance recovery check performed</strong><p>The UI did not automatically repeat the decision request.</p></div> : null}
    <section className={`quoteReadiness ${preflight?.eligibleForAcceptance ? 'ready' : 'blocked'}`} aria-labelledby="review-status-heading"><h3 id="review-status-heading">Review status</h3>
      {preflight?.eligibleForAcceptance ? <p><strong>Ready to accept</strong></p> : <><p><strong>Action is blocked</strong></p><ul>{preflight?.blockers.map((blocker) => <li key={blocker.code}>{blocker.message}</li>)}</ul></>}
    </section>
    <section className="panel quoteSection"><div className="panelHeader"><h3>Customer request</h3></div><dl className="quoteFacts"><div><dt>Customer</dt><dd>{submission.customer?.fullName}</dd></div><div><dt>Contact</dt><dd>{submission.customer?.email}<br />{submission.customer?.mobile}</dd></div><div><dt>Property</dt><dd>{submission.property?.addressLine1}, {submission.property?.suburb}</dd></div><div><dt>Requested service</dt><dd>{submission.request?.primaryService?.canonicalService ?? submission.request?.primaryService?.websiteValue}</dd></div><div><dt>Frequency</dt><dd>{words(submission.request?.frequency)}</dd></div><div><dt>Preferred date</dt><dd>{submission.visit?.preferredDate}</dd></div></dl></section>
    <form className="quoteResolutionGrid" onSubmit={saveResolution} aria-label="Customer and Property resolution">
      <section className="panel quoteSection"><div className="panelHeader"><h3>Customer resolution</h3></div><p className="resolutionState">Match result: <strong>{words(quote.resolution.customer.state)}</strong></p>
        <fieldset><legend>Customer decision</legend><label><input type="radio" name="customerDecision" checked={customerDecision === 'USE_EXISTING'} onChange={() => { setCustomerDecision('USE_EXISTING'); setPropertyDecision('CREATE_NEW'); setPropertyId(''); }} /> Use existing Customer</label><label><input type="radio" name="customerDecision" checked={customerDecision === 'CREATE_NEW'} onChange={() => { setCustomerDecision('CREATE_NEW'); setCustomerId(''); setPropertyDecision('CREATE_NEW'); setPropertyId(''); }} /> Create new Customer on acceptance</label></fieldset>
        {customerDecision === 'USE_EXISTING' ? <label className="quoteSelect">Existing Customer<select required value={customerId} onChange={(event) => { setCustomerId(event.target.value); setPropertyDecision('CREATE_NEW'); setPropertyId(''); }}><option value="">Select a candidate</option>{quote.resolution.customer.candidates.map((candidate) => <option value={candidate.id} key={candidate.id}>{candidate.displayName}{candidate.context ? ` — ${candidate.context}` : ''} — {candidate.evidence.map(words).join(', ')}</option>)}</select></label> : <p className="helpText">Submitted identity will create a new Customer. Existing records are not overwritten.</p>}
      </section>
      <section className="panel quoteSection"><div className="panelHeader"><h3>Property resolution</h3></div><p className="resolutionState">Match result: <strong>{words(quote.resolution.property.state)}</strong></p>
        <fieldset><legend>Property decision</legend><label><input type="radio" name="propertyDecision" checked={propertyDecision === 'USE_EXISTING'} disabled={customerDecision !== 'USE_EXISTING' || !customerId} onChange={() => setPropertyDecision('USE_EXISTING')} /> Use existing Property</label><label><input type="radio" name="propertyDecision" checked={propertyDecision === 'CREATE_NEW'} onChange={() => { setPropertyDecision('CREATE_NEW'); setPropertyId(''); }} /> Create new Property on acceptance</label></fieldset>
        {propertyDecision === 'USE_EXISTING' ? <label className="quoteSelect">Property belonging to selected Customer<select required value={propertyId} onChange={(event) => setPropertyId(event.target.value)}><option value="">Select a Property</option>{selectedCustomerProperties.map((property) => <option value={property.id} key={property.id}>{property.name} — {property.addressLine1}, {property.city}</option>)}</select></label> : <p className="helpText">Submitted master data will create a Property. Visit-specific access facts remain on the Work Order.</p>}
        <button className="primaryButton" disabled={saving || (customerDecision === 'USE_EXISTING' && !customerId) || (propertyDecision === 'USE_EXISTING' && (!propertyId || !selectedCustomerProperties.some((item) => item.id === propertyId)))}>{saving ? 'Saving…' : 'Save resolution'}</button>
      </section>
    </form>
    <section className="panel quoteSection"><div className="panelHeader"><h3>Service &amp; operational scope</h3></div><dl className="quoteFacts operationalFacts">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{String(value)}</dd></div>)}</dl>{submission.request?.addOns?.length ? <div className="quoteAddOns"><h4>Selected add-ons</h4><ul>{submission.request.addOns.map((item: any, index: number) => <li key={`${item.canonicalService}-${index}`}>{item.canonicalService ?? item.websiteValue} × {item.quantity}</li>)}</ul></div> : null}</section>
    <section className="panel quoteSection"><div className="panelHeader"><div><h3>Authoritative pricing</h3><p>Immutable revision {current.revisionNumber} snapshot — not recalculated.</p></div></div><div className="pricingLines">{current.lineItems.map((line) => <div key={line.id}><span>{line.label} {line.quantity > 1 ? `× ${line.quantity}` : ''}</span><strong>{money(line.lineTotalMinor, current.currency)}</strong></div>)}</div><dl className="pricingTotals"><div><dt>Subtotal</dt><dd>{money(current.subtotalMinor, current.currency)}</dd></div>{current.discountMinor ? <div><dt>Discount{current.discountReason ? ` — ${current.discountReason}` : ''}</dt><dd>{money(current.discountMinor, current.currency)}</dd></div> : null}{current.taxEnabled ? <div><dt>Tax</dt><dd>{money(current.taxMinor, current.currency)}</dd></div> : null}<div className="total"><dt>Total</dt><dd>{money(current.totalMinor, current.currency)}</dd></div></dl></section>
    <section className="panel quoteSection"><div className="panelHeader"><div><h3>Customer Quote Photos</h3><p>Customer-supplied evidence, separate from cleaner Before/After photos.</p></div></div><div className="quoteEvidence">{quote.photos.filter((photo) => photo.source === 'CUSTOMER').map((photo) => <article key={photo.id}>{photo.url && photo.status === 'STORED' ? <a href={photo.url} target="_blank" rel="noreferrer"><img src={photo.url} alt={photo.originalFileName} /></a> : <div className="photoPlaceholder" aria-label={`${photo.originalFileName}: ${words(photo.status)}`}>No preview</div>}<strong>{photo.originalFileName}</strong><span>{words(photo.status)}</span></article>)}{!quote.photos.some((photo) => photo.source === 'CUSTOMER') ? <p>No customer Quote photos were supplied.</p> : null}</div></section>
    <section className="panel quoteSection"><div className="panelHeader"><h3>Activity</h3></div><ol className="quoteTimeline">{quote.activities.map((activity) => <li key={activity.id}><strong>{activityLabel(activity.type, activity.previousStatus, activity.newStatus)}</strong><p>{actorName(activity.actorUserId)} · <time dateTime={activity.createdAt}>{new Date(activity.createdAt).toLocaleString('en-ZA')}</time></p>{activity.note ? <p>{activity.note}</p> : null}</li>)}</ol></section>
    {quote.status === 'ACCEPTED' ? <section className="panel quoteAccepted"><h3>Accepted operational records</h3><p>Accepted by {actorName(quote.acceptedByUserId)}{quote.acceptedAt ? ` on ${new Date(quote.acceptedAt).toLocaleString('en-ZA')}` : ''}.</p><div className="rowActions">{quote.customerId ? <Link href={`/customers?customerId=${quote.customerId}`}>View Customer</Link> : null}{quote.propertyId ? <Link href={`/properties?propertyId=${quote.propertyId}`}>View Property</Link> : null}{quote.recurringAgreementId ? <Link href={`/recurring-services?agreementId=${quote.recurringAgreementId}`}>View Recurring Agreement</Link> : null}{quote.workOrderId ? <Link className="primaryButton" href={`/work-orders/${quote.workOrderId}`}>View Initial Work Order</Link> : null}</div></section> : null}
    {canDecide ? <section className="panel quoteDecision"><div><h3>Accept or decline</h3><p>Decisions apply only to revision {quote.currentRevisionNumber}.</p></div><div className="quoteDecisionActions"><button type="button" className="dangerButton" disabled={saving} onClick={() => declineDialog.current?.showModal()}>Decline Quote</button><button type="button" className="primaryButton" disabled={saving || !preflight?.eligibleForAcceptance} onClick={() => void prepareAccept()}>Review acceptance</button></div></section> : null}
    <dialog ref={acceptDialog} className="quoteDialog" aria-labelledby="accept-title"><h3 id="accept-title">Accept {quote.reference}?</h3><dl><div><dt>Customer</dt><dd>{decisionText(quote.customerResolution, 'Customer')}</dd></div><div><dt>Property</dt><dd>{decisionText(quote.propertyResolution, 'Property')}</dd></div><div><dt>Service</dt><dd>{submission.request?.primaryService?.canonicalService ?? submission.request?.primaryService?.websiteValue}</dd></div><div><dt>Preferred date</dt><dd>{submission.visit?.preferredDate}</dd></div><div><dt>Commercial total</dt><dd>{money(current.totalMinor, current.currency)}</dd></div></dl><p><strong>{submission.request?.frequency === 'ONE_TIME' ? 'Creates one Work Order.' : 'Creates one Recurring Service Agreement and its initial Work Order.'}</strong></p><div className="dialogActions"><button type="button" onClick={() => acceptDialog.current?.close()}>Cancel</button><button type="button" className="primaryButton" disabled={saving} onClick={() => void accept()}>{saving ? 'Accepting…' : 'Accept Quote'}</button></div></dialog>
    <dialog ref={declineDialog} className="quoteDialog" aria-labelledby="decline-title"><form onSubmit={decline}><h3 id="decline-title">Decline {quote.reference}?</h3><p>This terminal decision applies to revision {quote.currentRevisionNumber}.</p><label>Reason<textarea required minLength={3} maxLength={500} rows={4} value={declineReason} onChange={(event) => setDeclineReason(event.target.value)} /></label><div className="dialogActions"><button type="button" onClick={() => declineDialog.current?.close()}>Cancel</button><button className="dangerButton" disabled={saving || declineReason.trim().length < 3}>{saving ? 'Declining…' : 'Decline Quote'}</button></div></form></dialog>
  </div>;
}
