import { POST_EVENT_CLEANING_SERVICE } from '../quotes/post-event-cleaning-operating-model';
import type { MessagingQuoteDraftProgress } from './messaging-quote-draft';

export type MessagingGuidedPostEventQuestionId =
  | 'EVENT_TYPE'
  | 'VENUE_TYPE'
  | 'GUEST_BAND'
  | 'EXACT_BATHROOMS'
  | 'KITCHEN_USED'
  | 'DISHWASHING'
  | 'OUTDOOR_AREAS'
  | 'WASTE_LEVEL'
  | 'SIGNIFICANT_SOILING'
  | 'OVERNIGHT'
  | 'BULK_WASTE'
  | 'SPECIALIST_CONTAMINATION'
  | 'SPECIALIST_CARPET_UPHOLSTERY'
  | 'COMPLEX_VENUE';

export type MessagingGuidedPostEventQuestion = { id: MessagingGuidedPostEventQuestionId; text: string };

const EVENT_TYPES = { '1':'PARTY_BIRTHDAY','2':'WEDDING_RECEPTION','3':'FAMILY_GATHERING','4':'CORPORATE_EVENT','5':'FUNERAL_MEMORIAL','6':'OTHER' } as const;
const VENUE_TYPES = { '1':'HOME','2':'APARTMENT','3':'BUSINESS_PREMISES','4':'EVENT_VENUE','5':'OTHER' } as const;
const GUEST_BANDS = { '1':'ONE_TO_20','2':'FROM_21_TO_50','3':'FROM_51_TO_100','4':'FROM_101_TO_150','5':'FROM_150_UP' } as const;
const DISHWASHING = { '1':'NONE','2':'MODERATE','3':'HEAVY' } as const;
const WASTE_LEVELS = { '1':'LIGHT','2':'MODERATE','3':'HEAVY' } as const;
const OUTDOOR_AREAS = { '1':'PATIO','2':'BALCONY','3':'BRAAI_AREA','4':'GARDEN_ENTERTAINMENT_AREA' } as const;

function requestProgress(draft: MessagingQuoteDraftProgress): Record<string, unknown> {
  const value = draft.request;
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function postEventProgress(draft: MessagingQuoteDraftProgress): Record<string, unknown> {
  const value = requestProgress(draft).postEvent;
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function primaryService(draft: MessagingQuoteDraftProgress): string | null {
  const primary = requestProgress(draft).primaryService;
  if (!primary || typeof primary !== 'object' || Array.isArray(primary)) return null;
  const canonical = (primary as Record<string, unknown>).canonicalService;
  return typeof canonical === 'string' ? canonical : null;
}
function hasBoolean(record: Record<string, unknown>, key: string) { return typeof record[key] === 'boolean'; }

export function nextMessagingGuidedPostEventQuestion(draft: MessagingQuoteDraftProgress): MessagingGuidedPostEventQuestion | null {
  if (primaryService(draft) !== POST_EVENT_CLEANING_SERVICE) return null;
  const facts = postEventProgress(draft);
  if (!facts.eventType) return { id:'EVENT_TYPE', text:'What type of event was it?\n1. Party or birthday\n2. Wedding or reception\n3. Family gathering\n4. Corporate event\n5. Funeral or memorial\n6. Other\nReply with the number only.' };
  if (!facts.venueType) return { id:'VENUE_TYPE', text:'Where did the event take place?\n1. House/home\n2. Apartment\n3. Business premises\n4. Event venue\n5. Other\nReply with the number only.' };
  if (!facts.guestBand) return { id:'GUEST_BAND', text:'Approximately how many guests attended?\n1. 1–20\n2. 21–50\n3. 51–100\n4. 101–150\n5. 150+\nReply with the number only.' };
  if (!Number.isInteger(facts.bathrooms)) return { id:'EXACT_BATHROOMS', text:'How many bathrooms were used by the event? Reply with the exact whole number, from 1 to 20.' };
  if (!hasBoolean(facts,'kitchenSubstantiallyUsed')) return { id:'KITCHEN_USED', text:'Was the kitchen substantially used for food service? Reply YES or NO exactly.' };
  if (!facts.dishwashing) return { id:'DISHWASHING', text:'How much dishwashing is required?\n1. None\n2. Moderate\n3. Heavy\nReply with the number only.' };
  if (!Array.isArray(facts.outdoorAreas)) return { id:'OUTDOOR_AREAS', text:'Which outdoor event areas need cleaning?\n0. None\n1. Patio\n2. Balcony\n3. Braai area\n4. Garden entertainment area\nReply with 0, or comma-separated numbers such as 1,3.' };
  if (!facts.wasteLevel) return { id:'WASTE_LEVEL', text:'How much ordinary event waste is there?\n1. Light — roughly normal household-bin quantities\n2. Moderate — noticeable waste across several areas\n3. Heavy — substantial event waste or food/drink debris\nReply with the number only.' };
  if (!hasBoolean(facts,'significantOrdinarySoiling')) return { id:'SIGNIFICANT_SOILING', text:'Are there significant ordinary spills or heavily soiled areas? Reply YES or NO exactly.' };
  if (!hasBoolean(facts,'lateNightOrOvernight')) return { id:'OVERNIGHT', text:'Will the cleaning need to happen late at night or overnight? Reply YES or NO exactly.' };
  if (!hasBoolean(facts,'bulkWasteRemovalRequested')) return { id:'BULK_WASTE', text:'Do you need Homent to transport bulk waste away from the property or venue? Reply YES or NO exactly.' };
  if (!hasBoolean(facts,'specialistContamination')) return { id:'SPECIALIST_CONTAMINATION', text:'Is there any hazardous, biohazard or specialist contamination involved? Reply YES or NO exactly.' };
  if (!hasBoolean(facts,'specialistCarpetOrUpholstery')) return { id:'SPECIALIST_CARPET_UPHOLSTERY', text:'Do you need specialist carpet or upholstery treatment/extraction? Reply YES or NO exactly.' };
  if (!hasBoolean(facts,'complexVenue')) return { id:'COMPLEX_VENUE', text:'Is this a large or operationally complex commercial/event venue rather than an ordinary home or small/medium venue? Reply YES or NO exactly.' };
  return null;
}

export type MessagingGuidedPostEventAnswer =
  | { kind:'ACCEPTED'; patch: MessagingQuoteDraftProgress }
  | { kind:'INVALID'; question: MessagingGuidedPostEventQuestion }
  | { kind:'COMPLETE' }
  | { kind:'NOT_APPLICABLE' };

function yesNo(text:string): boolean|undefined { if(text==='YES') return true; if(text==='NO') return false; return undefined; }
function parseOutdoorAreas(text:string) {
  if (text === '0') return [] as Array<(typeof OUTDOOR_AREAS)[keyof typeof OUTDOOR_AREAS]>;
  if (!/^\d(?:,\d)*$/.test(text)) return undefined;
  const keys = text.split(',');
  if (new Set(keys).size !== keys.length) return undefined;
  const values = keys.map((key) => OUTDOOR_AREAS[key as keyof typeof OUTDOOR_AREAS]);
  return values.every(Boolean) ? values : undefined;
}

export function applyMessagingGuidedPostEventAnswer(draft: MessagingQuoteDraftProgress, rawText: string|null|undefined): MessagingGuidedPostEventAnswer {
  if (primaryService(draft) !== POST_EVENT_CLEANING_SERVICE) return { kind:'NOT_APPLICABLE' };
  const question = nextMessagingGuidedPostEventQuestion(draft);
  if (!question) return { kind:'COMPLETE' };
  const text = rawText?.trim() ?? '';
  let value: unknown;
  switch(question.id) {
    case 'EVENT_TYPE': value=EVENT_TYPES[text as keyof typeof EVENT_TYPES]; break;
    case 'VENUE_TYPE': value=VENUE_TYPES[text as keyof typeof VENUE_TYPES]; break;
    case 'GUEST_BAND': value=GUEST_BANDS[text as keyof typeof GUEST_BANDS]; break;
    case 'EXACT_BATHROOMS': { const parsed=/^\d{1,2}$/.test(text)?Number(text):Number.NaN; value=Number.isInteger(parsed)&&parsed>=1&&parsed<=20?parsed:undefined; break; }
    case 'KITCHEN_USED': case 'SIGNIFICANT_SOILING': case 'OVERNIGHT': case 'BULK_WASTE': case 'SPECIALIST_CONTAMINATION': case 'SPECIALIST_CARPET_UPHOLSTERY': case 'COMPLEX_VENUE': value=yesNo(text); break;
    case 'DISHWASHING': value=DISHWASHING[text as keyof typeof DISHWASHING]; break;
    case 'OUTDOOR_AREAS': value=parseOutdoorAreas(text); break;
    case 'WASTE_LEVEL': value=WASTE_LEVELS[text as keyof typeof WASTE_LEVELS]; break;
  }
  if (value === undefined) return { kind:'INVALID', question };
  const keyByQuestion: Record<MessagingGuidedPostEventQuestionId,string> = {
    EVENT_TYPE:'eventType', VENUE_TYPE:'venueType', GUEST_BAND:'guestBand', EXACT_BATHROOMS:'bathrooms', KITCHEN_USED:'kitchenSubstantiallyUsed', DISHWASHING:'dishwashing', OUTDOOR_AREAS:'outdoorAreas', WASTE_LEVEL:'wasteLevel', SIGNIFICANT_SOILING:'significantOrdinarySoiling', OVERNIGHT:'lateNightOrOvernight', BULK_WASTE:'bulkWasteRemovalRequested', SPECIALIST_CONTAMINATION:'specialistContamination', SPECIALIST_CARPET_UPHOLSTERY:'specialistCarpetOrUpholstery', COMPLEX_VENUE:'complexVenue'
  };
  return { kind:'ACCEPTED', patch:{ request:{ postEvent:{ [keyByQuestion[question.id]]: value } } } };
}
