import { validateQuoteBusinessFacts } from '../quotes/quote-business-facts-validation';
import { POST_EVENT_CLEANING_SERVICE } from '../quotes/post-event-cleaning-operating-model';
import { isLaundryEligiblePrimary } from '../quotes/laundry-operating-model';
import type { MessagingQuoteDraft } from './messaging-quote-draft';
import {
  HOMENT_QUOTE_FLOW_COMPLETION,
  HOMENT_QUOTE_FLOW_CONTRACT,
  HOMENT_QUOTE_FLOW_JSON_VERSION,
  HOMENT_QUOTE_FLOW_MAPPING,
} from './whatsapp-quote-flow-session.service';

export type FlowV1SessionEvidence = {
  status: string;
  flowContractId: string;
  mappingVersion: string;
  completionContractId: string;
  providerFlowArtifactId: string;
  flowJsonVersion: string;
  completionFingerprint: string | null;
  completionEvidence: unknown;
};

export type FlowV1MappingResult =
  | { kind: 'READY'; draft: MessagingQuoteDraft; submittedAt: Date }
  | { kind: 'HUMAN_REVIEW'; reason: string }
  | { kind: 'INVALID'; reason: string; errors?: Array<{ path: string; code: string; message: string }> };

type Obj = Record<string, unknown>;
const META_KEYS = new Set(['homent_contract', 'homent_mapping_version', 'homent_completion_version']);
const SERVICE: Record<string, { websiteValue: string; canonicalService: string | null }> = {
  REGULAR_HOME: { websiteValue: 'Regular Home Cleaning', canonicalService: 'Regular Home Cleaning' },
  DEEP: { websiteValue: 'Deep Cleaning', canonicalService: 'Deep Cleaning' },
  MOVE_IN: { websiteValue: 'Move-In Cleaning', canonicalService: 'Move-In Cleaning' },
  MOVE_OUT: { websiteValue: 'Move-Out Cleaning', canonicalService: 'Move-Out Cleaning' },
  KITCHEN: { websiteValue: 'Kitchen Cleaning', canonicalService: 'Kitchen Cleaning' },
  BATHROOM: { websiteValue: 'Bathroom Sanitisation', canonicalService: 'Bathroom Sanitisation' },
  BEDROOM: { websiteValue: 'Bedroom Cleaning', canonicalService: 'Bedroom Cleaning' },
  LIVING_AREA: { websiteValue: 'Living Area Cleaning', canonicalService: 'Living Area Cleaning' },
  INTERIOR_WINDOWS: { websiteValue: 'Interior Window Cleaning', canonicalService: 'Interior Window Cleaning' },
  POST_RENOVATION: { websiteValue: 'Post-Renovation Cleaning', canonicalService: 'Post-Renovation Cleaning' },
  POST_EVENT: { websiteValue: POST_EVENT_CLEANING_SERVICE, canonicalService: POST_EVENT_CLEANING_SERVICE },
  NOT_SURE: { websiteValue: 'Not sure', canonicalService: null },
};
const ADD_ONS: Record<string, { websiteValue: string; canonicalService: string }> = {
  INSIDE_OVEN: { websiteValue: 'Inside oven', canonicalService: 'Inside Oven Cleaning' },
  INSIDE_FRIDGE: { websiteValue: 'Inside fridge', canonicalService: 'Inside Fridge Cleaning' },
  INSIDE_CUPBOARDS: { websiteValue: 'Inside cupboards', canonicalService: 'Interior Cupboard Cleaning' },
  INTERIOR_WINDOWS: { websiteValue: 'Interior windows', canonicalService: 'Interior Window Cleaning' },
  BED_MAKING: { websiteValue: 'Bed making', canonicalService: 'Bed Making' },
  LINEN_CHANGE: { websiteValue: 'Linen change', canonicalService: 'Linen Change' },
  BALCONY_PATIO: { websiteValue: 'Balcony / Patio Cleaning', canonicalService: 'Balcony / Patio Cleaning' },
  GARAGE_SWEEP: { websiteValue: 'Garage sweep', canonicalService: 'Garage Sweeping' },
  EXTRA_BATHROOM: { websiteValue: 'Extra bathroom', canonicalService: 'Extra Bathroom Cleaning' },
  EXTRA_REFRIGERATOR: { websiteValue: 'Extra refrigerator', canonicalService: 'Extra Refrigerator' },
  PET_HAIR: { websiteValue: 'Pet-hair treatment', canonicalService: 'Pet-Hair Treatment' },
};
const FREQUENCY_FIELDS = ['frequency_full', 'frequency_deep', 'frequency_simple'] as const;
const POST_EVENT_FIELDS = [
  'post_event_type','post_event_venue_type','post_event_guest_band','post_event_bathrooms','post_event_kitchen_used',
  'post_event_dishwashing','post_event_outdoor_areas','post_event_waste_level','post_event_significant_soiling',
  'post_event_overnight','post_event_bulk_waste','post_event_specialist_contamination','post_event_specialist_carpet','post_event_complex_venue',
] as const;
const KNOWN_FIELDS = new Set([
  ...META_KEYS,
  'property_type','property_type_other','address_line_1','suburb','postal_code','country_sa_confirmed','floor_size','bedrooms_apartment','bedrooms_other','bathrooms','living_areas','storeys','apartment_floor','apartment_access','outdoor_area','estate_classification',
  'primary_service','service_not_sure_details',...FREQUENCY_FIELDS,'custom_frequency_note','home_condition',...POST_EVENT_FIELDS,
  'add_ons','extra_refrigerator_quantity','balcony_patio_quantity','eco_friendly_products','laundry_requested','ironing_requested','laundry_facilities','laundry_loads','ironing_loads',
  'preferred_date','alternative_date','preferred_time','flexibility','urgency','recurring_notes',
  'complex_access','security_instructions','parking','key_handover','key_handover_details','someone_present','has_pets','pet_type','pet_type_other','pet_temperament','off_limits_areas','fragile_items','product_restrictions_choice','product_restrictions_details','allergies_choice','allergies_details',
  'quote_photos','existing_damage','attention_areas','renovation_dust','appliance_notes','additional_notes',
  'full_name','email','mobile','preferred_contact',
]);

function object(value: unknown): Obj | null { return value && typeof value === 'object' && !Array.isArray(value) ? value as Obj : null; }
function text(value: unknown): string | undefined { return typeof value === 'string' && value.trim() ? value.trim() : undefined; }
function optionalText(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function bool(value: unknown): boolean | undefined { if (value === true || value === 'YES') return true; if (value === false || value === 'NO') return false; return undefined; }
function integer(value: unknown, min = 1): number | undefined { const n = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN; return Number.isSafeInteger(n) && n >= min ? n : undefined; }
function array(value: unknown): string[] | undefined { return Array.isArray(value) && value.every((v) => typeof v === 'string') ? value as string[] : undefined; }
function enumValue<T extends string>(value: unknown, allowed: readonly T[]): T | undefined { return typeof value === 'string' && allowed.includes(value as T) ? value as T : undefined; }
function has(data: Obj, key: string): boolean { return Object.prototype.hasOwnProperty.call(data, key); }
function reject(reason: string): FlowV1MappingResult { return { kind: 'INVALID', reason }; }
function appendNote(current: string, label: string, value?: string): string { return value ? [current, `${label}: ${value}`].filter(Boolean).join('\n') : current; }

export function mapWhatsAppQuoteFlowV1(session: FlowV1SessionEvidence): FlowV1MappingResult {
  if (session.status !== 'COMPLETED' || !session.completionFingerprint) return reject('Flow session is not a valid completed session.');
  if (session.flowContractId !== HOMENT_QUOTE_FLOW_CONTRACT || session.mappingVersion !== HOMENT_QUOTE_FLOW_MAPPING || session.completionContractId !== HOMENT_QUOTE_FLOW_COMPLETION || session.flowJsonVersion !== HOMENT_QUOTE_FLOW_JSON_VERSION || !session.providerFlowArtifactId.trim()) return reject('Flow session version/artifact binding is unsupported.');
  const evidence = object(session.completionEvidence); const data = object(evidence?.response);
  if (!evidence || !data || evidence.providerFlowArtifactId !== session.providerFlowArtifactId || evidence.flowJsonVersion !== session.flowJsonVersion) return reject('Flow completion evidence does not match its durable session binding.');
  if (data.homent_contract !== HOMENT_QUOTE_FLOW_CONTRACT || data.homent_mapping_version !== HOMENT_QUOTE_FLOW_MAPPING || data.homent_completion_version !== HOMENT_QUOTE_FLOW_COMPLETION) return reject('Flow completion metadata is incompatible with V1.');
  for (const key of Object.keys(data)) if (!KNOWN_FIELDS.has(key)) return reject(`Unsupported Flow V1 field: ${key}.`);

  const propertyType = enumValue(data.property_type, ['APARTMENT','TOWNHOUSE','HOUSE','DUPLEX','OTHER'] as const);
  const address = text(data.address_line_1); const suburb = text(data.suburb); const floorSize = text(data.floor_size);
  const bathrooms = text(data.bathrooms); const livingAreas = text(data.living_areas); const outdoorArea = text(data.outdoor_area); const estate = text(data.estate_classification);
  if (!propertyType || !address || !suburb || data.country_sa_confirmed !== true || !floorSize || !bathrooms || !livingAreas || !outdoorArea || !estate) return reject('Required Your Home facts are missing or malformed.');
  if (propertyType === 'APARTMENT') {
    if (has(data,'bedrooms_other') || has(data,'storeys')) return reject('Apartment submission contains hidden non-apartment fields.');
  } else if (has(data,'bedrooms_apartment') || has(data,'apartment_floor') || has(data,'apartment_access')) return reject('Non-apartment submission contains apartment-only fields.');
  const bedrooms = text(propertyType === 'APARTMENT' ? data.bedrooms_apartment : data.bedrooms_other);
  if (!bedrooms || (bedrooms === 'STUDIO' && propertyType !== 'APARTMENT')) return reject('Bedroom facts are invalid for the selected property type.');
  const property: Obj = { propertyType, addressLine1: address, suburb, postalCode: optionalText(data.postal_code), country: 'South Africa', floorSize, bedrooms, bathrooms, livingAreas, outdoorArea, estateClassification: estate };
  if (propertyType === 'APARTMENT') { const exactFloor = integer(data.apartment_floor, 0); const access = text(data.apartment_access); if (exactFloor === undefined || exactFloor > 50 || !access) return reject('Apartment floor/access facts are invalid.'); property.exactFloor = exactFloor; property.buildingAccess = access; }
  if (propertyType === 'DUPLEX') property.storeys = 'TWO';
  if (['TOWNHOUSE','HOUSE','OTHER'].includes(propertyType)) { const storeys = text(data.storeys); if (!storeys) return reject('Storeys are required for this property type.'); property.storeys = storeys; }
  if (propertyType === 'OTHER' && !text(data.property_type_other)) return reject('Other property type requires details.');
  if (propertyType !== 'OTHER' && has(data,'property_type_other')) return reject('Property type details are present for a non-Other property.');

  const serviceKey = text(data.primary_service); const primary = serviceKey ? SERVICE[serviceKey] : undefined;
  if (!primary) return reject('Primary service is missing or unsupported.');
  const selectedFrequencyFields = FREQUENCY_FIELDS.filter((key) => has(data,key));
  let frequency: string | undefined;
  if (['MOVE_IN','MOVE_OUT','POST_EVENT'].includes(serviceKey!)) { if (selectedFrequencyFields.length) return reject('Once-off service contains a hidden frequency field.'); frequency = 'ONE_TIME'; }
  else { if (selectedFrequencyFields.length !== 1) return reject('Exactly one service-specific frequency field is required.'); frequency = text(data[selectedFrequencyFields[0]]); }
  if (!frequency || !['ONE_TIME','WEEKLY','EVERY_TWO_WEEKS','MONTHLY','CUSTOM'].includes(frequency)) return reject('Frequency is missing or unsupported.');
  if (frequency === 'CUSTOM' && !text(data.custom_frequency_note)) return reject('Custom frequency requires a schedule note.');
  if (frequency !== 'CUSTOM' && has(data,'custom_frequency_note')) return reject('Custom frequency note is present for a non-Custom frequency.');
  const homeCondition = text(data.home_condition); if (!homeCondition) return reject('Home condition is required.');
  const request: Obj = { primaryService: primary, frequency, ...(frequency === 'CUSTOM' ? { customFrequencyNote: text(data.custom_frequency_note) } : {}), homeCondition };

  const postEventPresent = POST_EVENT_FIELDS.some((key) => has(data,key));
  if (serviceKey !== 'POST_EVENT' && postEventPresent) return reject('Post-Event fields are present for another service.');
  if (serviceKey === 'POST_EVENT') {
    const post: Obj = {}; const required = POST_EVENT_FIELDS.filter((key) => key !== 'post_event_outdoor_areas');
    if (required.some((key) => !has(data,key))) return reject('Required Post-Event facts are missing.');
    post.eventType=text(data.post_event_type); post.venueType=text(data.post_event_venue_type); post.guestBand=text(data.post_event_guest_band); post.bathrooms=integer(data.post_event_bathrooms,1);
    post.kitchenSubstantiallyUsed=bool(data.post_event_kitchen_used); post.dishwashing=text(data.post_event_dishwashing); post.outdoorAreas=array(data.post_event_outdoor_areas) ?? [];
    post.wasteLevel=text(data.post_event_waste_level); post.significantOrdinarySoiling=bool(data.post_event_significant_soiling); post.lateNightOrOvernight=bool(data.post_event_overnight); post.bulkWasteRemovalRequested=bool(data.post_event_bulk_waste); post.specialistContamination=bool(data.post_event_specialist_contamination); post.specialistCarpetOrUpholstery=bool(data.post_event_specialist_carpet); post.complexVenue=bool(data.post_event_complex_venue);
    if (Object.values(post).some((v) => v === undefined)) return reject('Post-Event facts are malformed.'); request.postEvent=post;
  }

  const addOnKeys = array(data.add_ons) ?? []; if (new Set(addOnKeys).size !== addOnKeys.length) return reject('Duplicate add-on values are not allowed.');
  const mappedAddOns = addOnKeys.map((key) => ADD_ONS[key]); if (mappedAddOns.some((v) => !v)) return reject('Unsupported add-on option.');
  request.addOns = mappedAddOns.map((value, index) => { const key=addOnKeys[index]; const quantity = key === 'EXTRA_REFRIGERATOR' ? integer(data.extra_refrigerator_quantity,1) : key === 'BALCONY_PATIO' ? integer(data.balcony_patio_quantity,1) : 1; return { ...value, quantity }; });
  if ((addOnKeys.includes('EXTRA_REFRIGERATOR')) !== has(data,'extra_refrigerator_quantity') || (addOnKeys.includes('BALCONY_PATIO')) !== has(data,'balcony_patio_quantity')) return reject('Add-on quantity fields contradict selected add-ons.');
  if ((request.addOns as Obj[]).some((a) => a.quantity === undefined)) return reject('Add-on quantity is invalid.');
  if (has(data,'eco_friendly_products')) { const eco=bool(data.eco_friendly_products); if (eco===undefined) return reject('Eco-friendly preference is malformed.'); request.ecoFriendlyProducts=eco; }
  const laundryRequested = data.laundry_requested === true; const ironingRequested = data.ironing_requested === true;
  if ((has(data,'laundry_facilities') || has(data,'laundry_loads')) && !laundryRequested) return reject('Laundry detail fields exist without Laundry being requested.');
  if (has(data,'ironing_loads') && !ironingRequested) return reject('Ironing quantity exists without Ironing being requested.');
  if ((laundryRequested || ironingRequested) && !isLaundryEligiblePrimary(primary.canonicalService)) return reject('Laundry/Ironing is not valid for the selected primary service.');
  if (laundryRequested || ironingRequested) { const laundry: Obj = {}; if (laundryRequested) { const facilities=text(data.laundry_facilities); const loads=integer(data.laundry_loads,1); if (!facilities || !loads) return reject('Laundry requires facilities and positive load quantity.'); laundry.facilities=facilities; laundry.laundryLoads=loads; } if (ironingRequested) { const loads=integer(data.ironing_loads,1); if (!loads) return reject('Ironing requires a positive load quantity.'); laundry.ironingLoads=loads; } request.laundry=laundry; }

  const preferredDate=text(data.preferred_date), preferredTime=text(data.preferred_time), flexibility=text(data.flexibility), urgency=text(data.urgency);
  if (!preferredDate || !preferredTime || !flexibility || !urgency) return reject('Preferred Visit facts are incomplete.');
  const visit: Obj = { preferredDate, alternativeDate: optionalText(data.alternative_date), preferredTime, flexibility, urgency, recurringNotes: optionalText(data.recurring_notes) };
  if (frequency === 'ONE_TIME' && has(data,'recurring_notes')) return reject('Recurring notes are present for a once-off request.');

  const complexAccess=text(data.complex_access), keyHandover=text(data.key_handover); const someonePresent=bool(data.someone_present);
  if (!complexAccess || !keyHandover || someonePresent===undefined) return reject('Access facts are incomplete.');
  if (keyHandover === 'TO_BE_ARRANGED' && !text(data.key_handover_details)) return reject('To-be-arranged key handover requires details.');
  if (keyHandover !== 'TO_BE_ARRANGED' && has(data,'key_handover_details')) return reject('Key handover details contradict the selected access path.');
  const access: Obj = { complexAccess, securityInstructions: optionalText(data.security_instructions), parking: optionalText(data.parking), keyHandover, ...(keyHandover==='TO_BE_ARRANGED'?{keyHandoverDetails:text(data.key_handover_details)}:{}), someonePresent };
  const hasPets=bool(data.has_pets); if (hasPets===undefined) return reject('Pet presence is required.');
  if (!hasPets && (has(data,'pet_type') || has(data,'pet_type_other') || has(data,'pet_temperament'))) return reject('Pet details are present when no pets were selected.');
  const household: Obj = { hasPets };
  if (hasPets) { const petType=text(data.pet_type), temperament=text(data.pet_temperament); if (!petType || !temperament) return reject('Pet details are required.'); if (petType==='OTHER') { const other=text(data.pet_type_other); if(!other) return reject('Other pet type requires details.'); household.petType=other; } else { if(has(data,'pet_type_other')) return reject('Other-pet details contradict selected pet type.'); household.petType=petType; } household.petTemperament=temperament; }

  const productChoice=text(data.product_restrictions_choice), allergiesChoice=text(data.allergies_choice); if (!productChoice || !allergiesChoice) return reject('Safety choice fields are required.');
  if ((productChoice==='DETAILS') !== has(data,'product_restrictions_details') || (allergiesChoice==='DETAILS') !== has(data,'allergies_details')) return reject('Safety detail fields contradict their choices.');
  const safety: Obj = { offLimitsAreas: optionalText(data.off_limits_areas), fragileItems: optionalText(data.fragile_items), productRestrictions: productChoice==='DETAILS'?text(data.product_restrictions_details):'', allergiesOrSensitivities: allergiesChoice==='DETAILS'?text(data.allergies_details):'', existingDamage: optionalText(data.existing_damage) };
  if (Object.values(safety).some((v)=>v===undefined)) return reject('Safety details are malformed.');
  let additionalNotes=optionalText(data.additional_notes); additionalNotes=appendNote(additionalNotes,'Property type details',propertyType==='OTHER'?text(data.property_type_other):undefined); additionalNotes=appendNote(additionalNotes,'Requested service details',serviceKey==='NOT_SURE'?text(data.service_not_sure_details):undefined);
  if (serviceKey==='NOT_SURE' && !text(data.service_not_sure_details)) return reject('Not sure service path requires request details.');
  if (serviceKey!=='NOT_SURE' && has(data,'service_not_sure_details')) return reject('Not-sure service details are present for a selected service.');
  const notes: Obj = { attentionAreas: optionalText(data.attention_areas), renovationDust: optionalText(data.renovation_dust), applianceNotes: optionalText(data.appliance_notes), additionalNotes };

  const photos = data.quote_photos;
  if (photos !== undefined && (!Array.isArray(photos) || photos.length > 0)) return { kind:'HUMAN_REVIEW', reason:'Flow PhotoPicker evidence is present but secure retrieval is not implemented.' };
  const fullName=text(data.full_name), email=text(data.email), mobile=text(data.mobile), preferredContact=text(data.preferred_contact); if (!fullName || !email || !mobile || !preferredContact) return reject('Customer details are incomplete.');
  const customer: Obj = { fullName, email, mobile, preferredContact };

  const draft = { customer, property, request, visit, access, household, safety, notes, photos: [] } as unknown as MessagingQuoteDraft;
  const errors = validateQuoteBusinessFacts(draft);
  if (errors.length) return { kind:'INVALID', reason:'Mapped Flow facts failed canonical Quote validation.', errors };
  if (serviceKey === 'NOT_SURE') return { kind:'HUMAN_REVIEW', reason:'Customer selected Not sure; service must not be guessed.' };
  const completedAt = object(session.completionEvidence)?.completedAt;
  return { kind:'READY', draft, submittedAt: typeof completedAt === 'string' && !Number.isNaN(new Date(completedAt).getTime()) ? new Date(completedAt) : new Date(0) };
}
