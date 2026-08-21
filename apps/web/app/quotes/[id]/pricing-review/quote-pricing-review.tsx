'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError, type QuoteDetail } from '../../../../lib/api';
import { reviewQuotePricing, type AddOnReviewDetail } from '../../../../lib/quote-pricing-review-api';

type AddOn = { websiteValue?: string; canonicalService?: string | null; quantity?: number };
type ReviewData = { addOns?: Record<string, AddOnReviewDetail> };

const money = (minor: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(minor / 100);

export function QuotePricingReview({ quoteId }: { quoteId: string }) {
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [details, setDetails] = useState<Record<string, AddOnReviewDetail>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [remaining, setRemaining] = useState<Array<{ code: string; message: string }>>([]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const current = await api.quote(quoteId);
      setQuote(current);
      const stored = (current.currentRevision.structuredData?.adminReview ?? {}) as ReviewData;
      setDetails(stored.addOns ?? {});
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'The Quote could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => { void load(); }, [load]);

  const addOns = useMemo(() => ((quote?.currentRevision.structuredData?.request?.addOns ?? []) as AddOn[]), [quote]);

  const setDetail = (index: number, patch: AddOnReviewDetail) => {
    setDetails((current) => ({
      ...current,
      [String(index)]: { ...(current[String(index)] ?? {}), ...patch },
    }));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!quote || saving) return;
    setSaving(true); setError(''); setNotice(''); setRemaining([]);
    try {
      const result = await reviewQuotePricing(
        quote.id,
        quote.currentRevisionNumber,
        addOns.map((_addOn, index) => ({ index, detail: details[String(index)] ?? {} })),
      );
      setRemaining(result.attentionReasons);
      if (result.status === 'SUBMITTED' && result.attentionReasons.length === 0) {
        setNotice(`Pricing review complete. New total: ${money(result.pricing.totalMinor)}. The Quote is no longer blocked by pricing review.`);
      } else {
        setNotice(`Revision ${result.revisionNumber} saved. Some review items still need attention.`);
      }
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'The pricing review could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  if (loading && !quote) return <p role="status">Loading pricing review…</p>;
  if (!quote) return <div className="errorBanner" role="alert">{error || 'Quote unavailable.'}</div>;

  return <div className="quoteWorkspace quoteDetail">
    <Link className="backLink" href={`/quotes/${quote.id}`}>← Back to Quote</Link>
    <header className="pageHeader">
      <div><p className="eyebrow">Admin Quote review</p><h2>Resolve pricing review</h2><p>{quote.reference} · revision {quote.currentRevisionNumber}</p></div>
    </header>

    {error ? <div className="errorBanner" role="alert">{error}</div> : null}
    {notice ? <div className="successBanner" role="status">{notice}</div> : null}

    <section className="panel quoteSection">
      <div className="panelHeader"><div><h3>Missing pricing details</h3><p>Confirm only the facts needed to price the selected add-ons. Saving creates a new immutable Admin revision; the customer’s original submission is not changed.</p></div></div>
      {!addOns.length ? <p>No website add-ons need pricing review on this revision.</p> : null}
      <form onSubmit={submit} className="quoteSubmissionGroup">
        {addOns.map((addOn, index) => {
          const canonical = addOn.canonicalService ?? addOn.websiteValue ?? 'Unknown add-on';
          const detail = details[String(index)] ?? {};
          return <fieldset key={`${canonical}-${index}`} className="panel quoteSection">
            <legend><strong>{canonical}</strong>{(addOn.quantity ?? 1) > 1 ? ` × ${addOn.quantity}` : ''}</legend>

            {canonical === 'Pet-Hair Treatment' ? <p><strong>{money(15_000)} per visit.</strong> This approved fixed price does not need another customer detail. Severe or unusual conditions still require separate review.</p> : null}

            {canonical === 'Inside Oven Cleaning' ? <>
              <label>Oven size
                <select required value={detail.ovenSize ?? ''} onChange={(event) => setDetail(index, { ovenSize: event.target.value as AddOnReviewDetail['ovenSize'] })}>
                  <option value="">Choose oven size</option>
                  <option value="STANDARD_SINGLE">Standard / single — R350</option>
                  <option value="LARGE_DOUBLE">Large / double — R500</option>
                </select>
              </label>
              <label><input type="checkbox" checked={Boolean(detail.severeBakedOnGrease)} onChange={(event) => setDetail(index, { severeBakedOnGrease: event.target.checked })} /> Severe baked-on grease (+R150)</label>
            </> : null}

            {canonical === 'Garage Sweeping' ? <label>Garage size
              <select required value={detail.garageSize ?? ''} onChange={(event) => setDetail(index, { garageSize: event.target.value as AddOnReviewDetail['garageSize'] })}>
                <option value="">Choose garage size</option>
                <option value="SINGLE">Empty standard single garage — R250</option>
                <option value="DOUBLE">Empty double garage — R400</option>
                <option value="LARGER_MULTI_CAR">Larger / multi-car — assessment required</option>
              </select>
            </label> : null}

            {canonical === 'Extra Bathroom Cleaning' ? <label>Bathroom type
              <select required value={detail.bathroomType ?? ''} onChange={(event) => setDetail(index, { bathroomType: event.target.value as AddOnReviewDetail['bathroomType'] })}>
                <option value="">Choose bathroom type</option>
                <option value="STANDARD">Standard bathroom — R200</option>
                <option value="LARGE_MASTER">Large / master bathroom — R300</option>
              </select>
            </label> : null}

            {!['Pet-Hair Treatment', 'Inside Oven Cleaning', 'Garage Sweeping', 'Extra Bathroom Cleaning'].includes(canonical) ? <p className="helpText">This add-on does not yet have a safe automatic remediation rule. It will remain blocked rather than guessing a price.</p> : null}
          </fieldset>;
        })}

        <button className="primaryButton" disabled={saving}>{saving ? 'Recalculating…' : 'Save details and recheck Quote'}</button>
      </form>
    </section>

    {remaining.length ? <section className="quoteReadiness blocked" aria-labelledby="remaining-heading"><h3 id="remaining-heading">Still needs attention</h3><ul>{remaining.map((reason, index) => <li key={`${reason.code}-${index}`}>{reason.message}</li>)}</ul></section> : null}

    <section className="panel quoteSection"><h3>What happens next?</h3><p>If every pricing and operational-cost check passes, the new revision returns to <strong>Submitted</strong> and the Quote can continue to acceptance. If something still needs review, the OS keeps the block and tells you exactly what remains.</p></section>
  </div>;
}
