'use client';

import { useEffect, useRef, useState } from 'react';
import {
  capabilityFromFragment,
  confirmQuoteView,
  issueViewChallenge,
  PublicQuoteProjection,
  resolvePublicQuote,
  respondToQuote,
} from '../../lib/public-quote-api';

type Decision = 'CUSTOMER_ACCEPTED' | 'CUSTOMER_DECLINED';
type ResultState = 'CONVERTED' | 'PENDING_INTERNAL_COMPLETION' | 'DECLINED' | null;

const TAB_CAPABILITY_KEY = 'homent.quoteCapability.v1';

function money(minor: number, currency: string) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(minor / 100);
}

function label(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'string') return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.map(label).join(', ');
  if (typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return label(object.canonicalService ?? object.name ?? object.label ?? Object.values(object)[0]);
  }
  return String(value);
}

function detailRows(source: Record<string, unknown>, keys: Array<[string, string]>) {
  return keys.flatMap(([key, title]) => source[key] == null || source[key] === '' ? [] : [{ title, value: label(source[key]) }]);
}

function clearVisibleFragment() {
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
}

function clearTabCapability() {
  try {
    window.sessionStorage.removeItem(TAB_CAPABILITY_KEY);
  } catch {
    // Some hardened browser contexts can disable storage. The current in-memory
    // capability still works; the page simply cannot offer reload continuity.
  }
}

function storeTabCapability(capability: string) {
  try {
    window.sessionStorage.setItem(TAB_CAPABILITY_KEY, capability);
  } catch {
    // See clearTabCapability: do not weaken transport merely to gain persistence.
  }
}

function recoverTabCapability(): string | null {
  try {
    const stored = window.sessionStorage.getItem(TAB_CAPABILITY_KEY);
    if (!stored) return null;
    const valid = capabilityFromFragment(`#${stored}`);
    if (!valid) clearTabCapability();
    return valid;
  } catch {
    return null;
  }
}

function acquireCapabilityForThisTab(): string | null {
  const fragmentSupplied = window.location.hash.length > 0;
  if (fragmentSupplied) {
    const fromFragment = capabilityFromFragment(window.location.hash);
    clearVisibleFragment();
    if (!fromFragment) {
      // Never fall back to a previously cached Quote when a new supplied fragment
      // is malformed. The new navigation intentionally replaces prior tab context.
      clearTabCapability();
      return null;
    }
    storeTabCapability(fromFragment);
    return fromFragment;
  }
  return recoverTabCapability();
}

function projectedResultState(projection: PublicQuoteProjection): ResultState {
  switch (projection.quote.customerResponseState) {
    case 'ACCEPTED_CONVERTED': return 'CONVERTED';
    case 'ACCEPTED_PENDING_INTERNAL_COMPLETION': return 'PENDING_INTERNAL_COMPLETION';
    case 'DECLINED': return 'DECLINED';
    default: return null;
  }
}

export function PublicQuotePage() {
  const [capability, setCapability] = useState<string | null>(null);
  const [projection, setProjection] = useState<PublicQuoteProjection | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resultState, setResultState] = useState<ResultState>(null);
  const started = useRef(false);
  const viewStarted = useRef(false);

  const markUnavailable = () => {
    clearTabCapability();
    setUnavailable(true);
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = acquireCapabilityForThisTab();
    if (!token) {
      setUnavailable(true);
      setLoading(false);
      return;
    }
    setCapability(token);
    resolvePublicQuote(token).then((value) => {
      setProjection(value);
      setResultState(projectedResultState(value));
      setNetworkError(false);
    }).catch((error: Error & { status?: number }) => {
      if (error.status === 404) markUnavailable();
      else setNetworkError(true);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!projection || !capability || viewStarted.current) return;
    viewStarted.current = true;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let challenge: { challenge: string; minimumVisibleDwellMs: number } | null = null;

    const schedule = () => {
      if (cancelled || !challenge || document.visibilityState !== 'visible' || timer) return;
      timer = setTimeout(() => {
        timer = null;
        if (cancelled || document.visibilityState !== 'visible') return;
        void confirmQuoteView(capability, challenge!.challenge).catch(() => undefined);
      }, challenge.minimumVisibleDwellMs);
    };
    const onVisibility = () => {
      if (document.visibilityState !== 'visible' && timer) {
        clearTimeout(timer);
        timer = null;
      }
      schedule();
    };

    document.addEventListener('visibilitychange', onVisibility);
    issueViewChallenge(capability).then((issued) => {
      if (cancelled) return;
      challenge = issued;
      schedule();
    }).catch(() => undefined);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [projection, capability]);

  const retryResolve = () => {
    if (!capability) return;
    setLoading(true);
    setNetworkError(false);
    resolvePublicQuote(capability).then((value) => {
      setProjection(value);
      setResultState(projectedResultState(value));
    }).catch((error: Error & { status?: number }) => {
      if (error.status === 404) markUnavailable();
      else setNetworkError(true);
    }).finally(() => setLoading(false));
  };

  const openConfirmation = (next: Decision) => {
    setDecision(next);
    setIdempotencyKey(crypto.randomUUID());
  };

  const confirmDecision = async () => {
    if (!capability || !decision || !idempotencyKey) return;
    setSubmitting(true);
    try {
      const result = await respondToQuote(capability, decision, idempotencyKey);
      setResultState(result.state);
      setDecision(null);
      const refreshed = await resolvePublicQuote(capability).catch(() => null);
      if (refreshed) {
        setProjection(refreshed);
        setResultState(projectedResultState(refreshed));
      }
    } catch (error) {
      const status = (error as Error & { status?: number }).status;
      if (status === 404) {
        setDecision(null);
        markUnavailable();
      } else if (status === 400 || status === 409) {
        setDecision(null);
        const refreshed = await resolvePublicQuote(capability).catch(() => null);
        if (refreshed) {
          setProjection(refreshed);
          setResultState(projectedResultState(refreshed));
        } else {
          setNetworkError(true);
        }
      } else {
        setNetworkError(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <main className="customerQuoteShell"><section className="quoteStateCard" aria-live="polite"><strong>Loading your quote…</strong><p>Please wait a moment.</p></section></main>;
  if (unavailable || !capability) return <main className="customerQuoteShell"><section className="quoteStateCard"><strong>This quote link is unavailable.</strong><p>It may have expired or been replaced. Please contact Homent if you need a current quote.</p></section></main>;
  if (networkError && !projection) return <main className="customerQuoteShell"><section className="quoteStateCard"><strong>We couldn’t load your quote.</strong><p>Check your connection and try again. Your quote has not been changed.</p><button className="quotePrimaryButton" onClick={retryResolve}>Try again</button></section></main>;
  if (!projection) return null;

  const { business, quote } = projection;
  const serviceRows = [
    ...detailRows(quote.request, [['primaryService', 'Service'], ['frequency', 'Frequency'], ['homeCondition', 'Home condition'], ['addOns', 'Add-ons'], ['ecoFriendlyProducts', 'Eco-friendly products'], ['laundry', 'Laundry'], ['postEvent', 'Post-event details']]),
    ...detailRows(quote.property, [['propertyType', 'Property type'], ['suburb', 'Area'], ['floorSize', 'Floor size'], ['bedrooms', 'Bedrooms'], ['bathrooms', 'Bathrooms'], ['livingAreas', 'Living areas'], ['storeys', 'Storeys'], ['outdoorArea', 'Outdoor area']]),
    ...detailRows(quote.visit, [['preferredDate', 'Preferred date'], ['alternativeDate', 'Alternative date'], ['preferredTime', 'Preferred time'], ['flexibility', 'Flexibility'], ['urgency', 'Urgency'], ['recurringNotes', 'Recurring details']]),
  ];
  const durableResultState = projectedResultState(projection);
  const effectiveResultState = durableResultState ?? resultState;
  const status = effectiveResultState === 'PENDING_INTERNAL_COMPLETION' ? 'Acceptance received' : effectiveResultState === 'CONVERTED' ? 'Accepted' : effectiveResultState === 'DECLINED' ? 'Declined' : 'Ready for your response';

  return <main className="customerQuoteShell">
    <article className="customerQuoteCard">
      <header className="quoteBrandHeader">
        <div><p className="quoteEyebrow">{business.tradingName ?? 'Homent'}</p><h1>Your quote</h1></div>
        <span className="quoteStatus">{status}</span>
      </header>

      {effectiveResultState === 'CONVERTED' && <div className="quoteSuccess" role="status"><strong>Your quote has been accepted.</strong><span>Thank you. We’ll take it from here.</span></div>}
      {effectiveResultState === 'PENDING_INTERNAL_COMPLETION' && <div className="quoteSuccess" role="status"><strong>Your acceptance has been received.</strong><span>Our team will complete the remaining setup. You do not need to accept again.</span></div>}
      {effectiveResultState === 'DECLINED' && <div className="quoteNotice" role="status"><strong>Your quote has been declined.</strong></div>}
      {networkError && projection && <div className="quoteWarning" role="alert">We couldn’t complete the last request. If you were accepting or declining, your decision may already have been received. Please retry the same action.</div>}

      <section className="quoteHero" aria-labelledby="quote-reference">
        <div><span>Quote</span><strong id="quote-reference">{quote.reference}</strong></div>
        <div><span>Valid until</span><strong>{new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium' }).format(new Date(quote.validUntil))}</strong></div>
        <div className="quoteTotal"><span>Total</span><strong>{money(quote.pricing.totalMinor, quote.pricing.currency)}</strong></div>
      </section>

      {serviceRows.length > 0 && <section className="quoteSection"><h2>Service details</h2><dl className="quoteDetails">{serviceRows.map((row, index) => <div key={`${row.title}-${index}`}><dt>{row.title}</dt><dd>{row.value}</dd></div>)}</dl></section>}

      <section className="quoteSection"><h2>Pricing</h2><div className="quoteLines">{quote.pricing.lineItems.map((item, index) => <div className="quoteLine" key={`${item.type}-${index}`}><div><strong>{item.label}</strong>{item.description && <span>{item.description}</span>}<small>Qty {item.quantity}</small></div><strong>{money(item.lineTotalMinor, quote.pricing.currency)}</strong></div>)}</div><dl className="quoteTotals"><div><dt>Subtotal</dt><dd>{money(quote.pricing.subtotalMinor, quote.pricing.currency)}</dd></div>{quote.pricing.discountMinor !== 0 && <div><dt>Discount / adjustment</dt><dd>-{money(Math.abs(quote.pricing.discountMinor), quote.pricing.currency)}</dd></div>}{quote.pricing.taxEnabled && <div><dt>Tax</dt><dd>{money(quote.pricing.taxMinor, quote.pricing.currency)}</dd></div>}<div className="grandTotal"><dt>Total</dt><dd>{money(quote.pricing.totalMinor, quote.pricing.currency)}</dd></div></dl></section>

      {quote.actionable && !effectiveResultState && <section className="quoteActions" aria-label="Quote actions"><button className="quotePrimaryButton" onClick={() => openConfirmation('CUSTOMER_ACCEPTED')}>Accept Quote</button><button className="quoteSecondaryButton" onClick={() => openConfirmation('CUSTOMER_DECLINED')}>Decline Quote</button></section>}

      <footer className="quoteFooter">{business.contactNumber && <span>{business.contactNumber}</span>}{business.businessEmail && <span>{business.businessEmail}</span>}{business.website && <span>{business.website}</span>}</footer>
    </article>

    {decision && <div className="quoteModalBackdrop" role="presentation"><section className="quoteModal" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><h2 id="confirm-title">{decision === 'CUSTOMER_ACCEPTED' ? 'Accept this quote?' : 'Decline this quote?'}</h2><p>{quote.reference} · {money(quote.pricing.totalMinor, quote.pricing.currency)}</p><p>{decision === 'CUSTOMER_ACCEPTED' ? 'Confirm that you accept this quote.' : 'Confirm that you want to decline this quote.'}</p><div className="quoteModalActions"><button className={decision === 'CUSTOMER_ACCEPTED' ? 'quotePrimaryButton' : 'quoteDangerButton'} disabled={submitting} onClick={confirmDecision}>{submitting ? 'Sending…' : decision === 'CUSTOMER_ACCEPTED' ? 'Confirm acceptance' : 'Confirm decline'}</button><button className="quoteSecondaryButton" disabled={submitting} onClick={() => setDecision(null)}>Cancel</button></div></section></div>}
  </main>;
}
