import { isLaundryEligiblePrimary, type LaundryFacilities } from '../quotes/laundry-operating-model';
import type { MessagingQuoteDraftProgress } from './messaging-quote-draft';
import { applyMessagingGuidedVisitHouseholdAnswer, nextMessagingGuidedVisitHouseholdQuestion, type MessagingGuidedVisitHouseholdQuestion } from './messaging-quote-guided-visit-household';

export type MessagingGuidedPersonaliseQuestionId = 'ADD_ONS' | 'EXTRA_REFRIGERATOR_QUANTITY' | 'BALCONY_PATIO_QUANTITY' | 'ECO_FRIENDLY_PRODUCTS' | 'LAUNDRY_FACILITIES' | 'LAUNDRY_LOADS' | 'IRONING_LOADS';
export type MessagingGuidedPersonaliseQuestion = { id: MessagingGuidedPersonaliseQuestionId; text: string } | MessagingGuidedVisitHouseholdQuestion;
type AddOn = { websiteValue: string; canonicalService: string; quantity: number };

const ADD_ONS = {
  '1': { websiteValue: 'Inside oven', canonicalService: 'Inside Oven Cleaning' }, '2': { websiteValue: 'Inside fridge', canonicalService: 'Inside Fridge Cleaning' }, '3': { websiteValue: 'Inside cupboards', canonicalService: 'Interior Cupboard Cleaning' }, '4': { websiteValue: 'Interior windows', canonicalService: 'Interior Window Cleaning' }, '5': { websiteValue: 'Bed making', canonicalService: 'Bed Making' }, '6': { websiteValue: 'Linen change', canonicalService: 'Linen Change' }, '7': { websiteValue: 'Balcony / Patio Cleaning', canonicalService: 'Balcony / Patio Cleaning' }, '8': { websiteValue: 'Garage sweep', canonicalService: 'Garage Sweeping' }, '9': { websiteValue: 'Extra bathroom', canonicalService: 'Extra Bathroom Cleaning' }, '10': { websiteValue: 'Extra refrigerator', canonicalService: 'Extra Refrigerator' }, '11': { websiteValue: 'Pet-hair treatment', canonicalService: 'Pet-Hair Treatment' },
} as const;
const LAUNDRY_FACILITIES: Record<string, LaundryFacilities> = { '1': 'WASHER_DRYER', '2': 'WASHER_LINE' };

function requestProgress(draft: MessagingQuoteDraftProgress): Record<string, unknown> { const value = draft.request; return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function primaryCanonical(request: Record<string, unknown>): string | null { const primary = request.primaryService; if (!primary || typeof primary !== 'object' || Array.isArray(primary)) return null; const value = (primary as Record<string, unknown>).canonicalService; return typeof value === 'string' ? value : null; }
function addOnsProgress(request: Record<string, unknown>): AddOn[] | undefined { if (!Object.prototype.hasOwnProperty.call(request, 'addOns')) return undefined; return Array.isArray(request.addOns) ? request.addOns as AddOn[] : []; }
function laundryProgress(request: Record<string, unknown>): Record<string, unknown> | undefined { const value = request.laundry; return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined; }
function findAddOn(addOns: AddOn[], canonicalService: string) { return addOns.find((item) => item.canonicalService === canonicalService); }
function positiveInteger(text: string): number | null { if (!/^\d+$/.test(text)) return null; const value = Number(text); return Number.isSafeInteger(value) && value >= 1 ? value : null; }
function addOnQuestion(primaryService: string | null): string { const laundryLines = isLaundryEligiblePrimary(primaryService) ? '\n12. Laundry\n13. Ironing' : ''; return `Would you like any add-ons? Reply with the numbers separated by commas, or 0 for none.\n1. Inside oven\n2. Inside fridge\n3. Inside cupboards\n4. Interior windows\n5. Bed making\n6. Linen change\n7. Balcony / patio cleaning\n8. Garage sweep\n9. Extra bathroom\n10. Extra refrigerator\n11. Pet-hair treatment${laundryLines}`; }

export function nextMessagingGuidedPersonaliseQuestion(draft: MessagingQuoteDraftProgress): MessagingGuidedPersonaliseQuestion | null {
  const request = requestProgress(draft); const addOns = addOnsProgress(request); const primary = primaryCanonical(request);
  if (!addOns) return { id: 'ADD_ONS', text: addOnQuestion(primary) };
  const extraFridge = findAddOn(addOns, 'Extra Refrigerator'); if (extraFridge && (!Number.isInteger(extraFridge.quantity) || extraFridge.quantity < 1)) return { id: 'EXTRA_REFRIGERATOR_QUANTITY', text: 'How many extra refrigerators need cleaning? Reply with a whole number only.' };
  const balcony = findAddOn(addOns, 'Balcony / Patio Cleaning'); if (balcony && (!Number.isInteger(balcony.quantity) || balcony.quantity < 1)) return { id: 'BALCONY_PATIO_QUANTITY', text: 'How many balcony or patio areas need cleaning? Reply with a whole number only.' };
  if (typeof request.ecoFriendlyProducts !== 'boolean') return { id: 'ECO_FRIENDLY_PRODUCTS', text: 'Would you like eco-friendly cleaning products?\n1. Yes\n2. No\nReply with the number only.' };
  const laundry = laundryProgress(request);
  if (laundry) {
    const wantsLaundry = Object.prototype.hasOwnProperty.call(laundry, 'laundryLoads'); const wantsIroning = Object.prototype.hasOwnProperty.call(laundry, 'ironingLoads');
    if (wantsLaundry && !laundry.facilities) return { id: 'LAUNDRY_FACILITIES', text: 'Laundry requires a working washing machine at the property. Which setup is available?\n1. Washing machine and dryer\n2. Washing machine and clothes line / drying rack\nReply with the number only.' };
    if (wantsLaundry && (!Number.isInteger(laundry.laundryLoads) || Number(laundry.laundryLoads) < 1)) return { id: 'LAUNDRY_LOADS', text: 'How many laundry loads do you need? Reply with a whole number only.' };
    if (wantsIroning && (!Number.isInteger(laundry.ironingLoads) || Number(laundry.ironingLoads) < 1)) return { id: 'IRONING_LOADS', text: 'How many ironing loads do you need? Reply with a whole number only.' };
  }
  return nextMessagingGuidedVisitHouseholdQuestion(draft);
}

export type MessagingGuidedPersonaliseAnswer = { kind: 'ACCEPTED'; patch: MessagingQuoteDraftProgress } | { kind: 'INVALID'; question: MessagingGuidedPersonaliseQuestion } | { kind: 'COMPLETE' };
export function applyMessagingGuidedPersonaliseAnswer(draft: MessagingQuoteDraftProgress, rawText: string | null | undefined): MessagingGuidedPersonaliseAnswer {
  const question = nextMessagingGuidedPersonaliseQuestion(draft); if (!question) return { kind: 'COMPLETE' };
  if (!['ADD_ONS','EXTRA_REFRIGERATOR_QUANTITY','BALCONY_PATIO_QUANTITY','ECO_FRIENDLY_PRODUCTS','LAUNDRY_FACILITIES','LAUNDRY_LOADS','IRONING_LOADS'].includes(question.id)) return applyMessagingGuidedVisitHouseholdAnswer(draft, rawText);
  const text = rawText?.trim() ?? ''; const request = requestProgress(draft); const addOns = addOnsProgress(request) ?? [];
  if (question.id === 'ADD_ONS') {
    if (text === '0') return { kind: 'ACCEPTED', patch: { request: { addOns: [] } } }; if (!/^\d+(?:\s*,\s*\d+)*$/.test(text)) return { kind: 'INVALID', question };
    const keys = [...new Set(text.split(',').map((part) => part.trim()))]; const primary = primaryCanonical(request); const standardKeys = keys.filter((key) => key !== '12' && key !== '13'); const selected = standardKeys.map((key) => ADD_ONS[key as keyof typeof ADD_ONS]); if (selected.some((value) => !value)) return { kind: 'INVALID', question };
    const wantsLaundry = keys.includes('12'); const wantsIroning = keys.includes('13'); if ((wantsLaundry || wantsIroning) && !isLaundryEligiblePrimary(primary)) return { kind: 'INVALID', question };
    return { kind: 'ACCEPTED', patch: { request: { addOns: selected.map((value) => ({ ...value, quantity: value.canonicalService === 'Extra Refrigerator' || value.canonicalService === 'Balcony / Patio Cleaning' ? 0 : 1 })), ...((wantsLaundry || wantsIroning) ? { laundry: { ...(wantsLaundry ? { laundryLoads: 0 } : {}), ...(wantsIroning ? { ironingLoads: 0 } : {}) } } : {}) } } };
  }
  if (question.id === 'EXTRA_REFRIGERATOR_QUANTITY' || question.id === 'BALCONY_PATIO_QUANTITY') { const quantity = positiveInteger(text); if (!quantity) return { kind: 'INVALID', question }; const target = question.id === 'EXTRA_REFRIGERATOR_QUANTITY' ? 'Extra Refrigerator' : 'Balcony / Patio Cleaning'; return { kind: 'ACCEPTED', patch: { request: { addOns: addOns.map((item) => item.canonicalService === target ? { ...item, quantity } : item) } } }; }
  if (question.id === 'ECO_FRIENDLY_PRODUCTS') { if (text !== '1' && text !== '2') return { kind: 'INVALID', question }; return { kind: 'ACCEPTED', patch: { request: { ecoFriendlyProducts: text === '1' } } }; }
  if (question.id === 'LAUNDRY_FACILITIES') { const facilities = LAUNDRY_FACILITIES[text]; if (!facilities) return { kind: 'INVALID', question }; return { kind: 'ACCEPTED', patch: { request: { laundry: { ...laundryProgress(request), facilities } } }; }
  const quantity = positiveInteger(text); if (!quantity) return { kind: 'INVALID', question };
  if (question.id === 'LAUNDRY_LOADS') return { kind: 'ACCEPTED', patch: { request: { laundry: { ...laundryProgress(request), laundryLoads: quantity } } } };
  return { kind: 'ACCEPTED', patch: { request: { laundry: { ...laundryProgress(request), ironingLoads: quantity } } };
}
