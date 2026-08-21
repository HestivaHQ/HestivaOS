import { applyQuoteProfitabilityFloor, type QuoteOperationalCostSnapshot } from './quote-profitability';
import { calculateWebsiteQuotePricing, type WebsiteQuotePricingAttentionReason, type WebsiteQuotePricingResult, type WebsiteQuoteSubmission } from './website-quote-pricing';
import type { WebsiteQuotePricingLineV1 } from './website-quote-contract';

export type AdminAddOnReviewDetail = {
  ovenSize?: 'STANDARD_SINGLE' | 'LARGE_DOUBLE';
  severeBakedOnGrease?: boolean;
  garageSize?: 'SINGLE' | 'DOUBLE' | 'LARGER_MULTI_CAR';
  bathroomType?: 'STANDARD' | 'LARGE_MASTER';
};

export type AdminQuoteReviewData = {
  addOns?: Record<string, AdminAddOnReviewDetail>;
};

type ReviewedSubmission = WebsiteQuoteSubmission & { adminReview?: AdminQuoteReviewData };

const line = (code: string, label: string, quantity: number, unitAmountMinor: number): WebsiteQuotePricingLineV1 => ({
  code,
  label,
  quantity,
  unitAmountMinor,
  lineAmountMinor: quantity * unitAmountMinor,
});

const attention = (code: string, path: string, message: string): WebsiteQuotePricingAttentionReason => ({ code, path, message });

function reviewedAddOn(
  submission: ReviewedSubmission,
  index: number,
): { line?: WebsiteQuotePricingLineV1; reason?: WebsiteQuotePricingAttentionReason } {
  const addOn = submission.request.addOns[index];
  const canonical = addOn.canonicalService;
  const quantity = addOn.quantity ?? 1;
  const detail = submission.adminReview?.addOns?.[String(index)];
  const path = `request.addOns.${index}`;

  if (canonical === 'Pet-Hair Treatment') {
    return { line: line('ADDON_PET_HAIR_TREATMENT', 'Pet-Hair Treatment', quantity, 15_000) };
  }

  if (canonical === 'Inside Oven Cleaning') {
    if (!detail?.ovenSize) return { reason: attention('ADD_ON_DETAIL_REQUIRED', path, 'Choose whether the oven is standard/single or large/double.') };
    const base = detail.ovenSize === 'LARGE_DOUBLE' ? 50_000 : 35_000;
    const severe = detail.severeBakedOnGrease ? 15_000 : 0;
    return { line: line('ADDON_INSIDE_OVEN', detail.severeBakedOnGrease ? 'Inside Oven Cleaning — severe baked-on grease' : 'Inside Oven Cleaning', quantity, base + severe) };
  }

  if (canonical === 'Garage Sweeping') {
    if (!detail?.garageSize) return { reason: attention('ADD_ON_DETAIL_REQUIRED', path, 'Choose the garage size before pricing this add-on.') };
    if (detail.garageSize === 'LARGER_MULTI_CAR') return { reason: attention('ADD_ON_ASSESSMENT_REQUIRED', path, 'Larger or multi-car garages require an assessment before final pricing.') };
    return { line: line('ADDON_GARAGE_CLEANING', 'Garage Cleaning', quantity, detail.garageSize === 'DOUBLE' ? 40_000 : 25_000) };
  }

  if (canonical === 'Extra Bathroom Cleaning') {
    if (!detail?.bathroomType) return { reason: attention('ADD_ON_DETAIL_REQUIRED', path, 'Choose whether the extra bathroom is standard or large/master.') };
    return { line: line('ADDON_EXTRA_BATHROOM', 'Extra Bathroom Cleaning', quantity, detail.bathroomType === 'LARGE_MASTER' ? 30_000 : 20_000) };
  }

  return { reason: attention('ADD_ON_DETAIL_REQUIRED', path, `${canonical} still requires a reviewed canonical pricing rule or additional scope detail.`) };
}

/**
 * Reprices an immutable Quote revision after Admin has supplied only the
 * missing canonical review facts. The customer submission stays intact;
 * adminReview is revision-owned evidence and is never written back to the website.
 */
export function calculateAdminReviewedQuotePricing(
  submission: ReviewedSubmission,
  operationalCosts?: QuoteOperationalCostSnapshot,
): WebsiteQuotePricingResult {
  const base = calculateWebsiteQuotePricing(submission);
  const lines = [...base.pricing.lines];
  const reasons = base.attentionReasons.filter((reason) => reason.code !== 'BREAK_EVEN_REVIEW_REQUIRED' && reason.code !== 'ADD_ON_DETAIL_REQUIRED');

  submission.request.addOns.forEach((_addOn, index) => {
    const result = reviewedAddOn(submission, index);
    if (result.line) lines.push(result.line);
    if (result.reason) reasons.push(result.reason);
  });

  const subtotalMinor = lines.reduce((sum, item) => sum + item.lineAmountMinor, 0);

  if (!operationalCosts) {
    reasons.push(attention('BREAK_EVEN_REVIEW_REQUIRED', '$', 'Universal break-even protection still needs the approved operational cost inputs before the customer price can be finalised.'));
    return {
      pricing: { currency: 'ZAR', subtotalMinor, adjustmentsMinor: 0, totalMinor: subtotalMinor, lines },
      attentionReasons: reasons,
      requiresBreakEvenReview: true,
    };
  }

  const profitability = applyQuoteProfitabilityFloor(subtotalMinor, operationalCosts);
  return {
    pricing: {
      currency: 'ZAR',
      subtotalMinor,
      adjustmentsMinor: profitability.finalTotalMinor - subtotalMinor,
      totalMinor: profitability.finalTotalMinor,
      lines,
    },
    attentionReasons: reasons,
    requiresBreakEvenReview: false,
    profitability,
  };
}
