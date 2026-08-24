import { describe, expect, it } from '@jest/globals';
import { mapWhatsAppQuoteFlowV1 } from './whatsapp-quote-flow-v1-mapper';

function session(response: Record<string, unknown>, overrides: Record<string, unknown> = {}) {
  return {
    status: 'COMPLETED', flowContractId: 'HOMENT_QUOTE_REQUEST_V1', mappingVersion: 'HOMENT_QUOTE_REQUEST_MAPPING_V1',
    completionContractId: 'HOMENT_QUOTE_REQUEST_COMPLETION_V1', providerFlowArtifactId: 'flow-1', flowJsonVersion: '7.3',
    completionFingerprint: 'abc', completionEvidence: { providerFlowArtifactId: 'flow-1', flowJsonVersion: '7.3', response }, ...overrides,
  } as any;
}

function validResponse() {
  return {
    homent_contract:'HOMENT_QUOTE_REQUEST_V1', homent_mapping_version:'HOMENT_QUOTE_REQUEST_MAPPING_V1', homent_completion_version:'HOMENT_QUOTE_REQUEST_COMPLETION_V1',
    property_type:'HOUSE', address_line_1:'1 Test Street', suburb:'Johannesburg', country_sa_confirmed:true, floor_size:'FROM_80_TO_99', bedrooms_other:'THREE', bathrooms:'TWO', living_areas:'ONE', storeys:'ONE', outdoor_area:'NONE', estate_classification:'NONE',
    primary_service:'DEEP', frequency_deep:'ONE_TIME', home_condition:'STANDARD', add_ons:[],
    preferred_date:'2026-08-25', preferred_time:'MORNING', flexibility:'Fully flexible', urgency:'Planning ahead',
    complex_access:'NOT_APPLICABLE', key_handover:'SOMEONE_WILL_OPEN', someone_present:'YES', has_pets:'NO', product_restrictions_choice:'NONE', allergies_choice:'NONE',
    full_name:'Test Customer', email:'test@example.com', mobile:'+27821234567', preferred_contact:'WHATSAPP',
  };
}

describe('WhatsApp Quote Flow V1 mapper', () => {
  it('maps a valid completed V1 response into canonical Messaging Quote facts', () => {
    const result = mapWhatsAppQuoteFlowV1(session(validResponse()));
    expect(result.kind).toBe('READY');
    if (result.kind !== 'READY') return;
    expect(result.draft.request.primaryService.canonicalService).toBe('Deep Cleaning');
    expect(result.draft.property.country).toBe('South Africa');
    expect(result.draft.photos).toEqual([]);
  });

  it('fails closed on wrong mapping version', () => {
    expect(mapWhatsAppQuoteFlowV1(session(validResponse(), { mappingVersion:'HOMENT_QUOTE_REQUEST_MAPPING_V2' })).kind).toBe('INVALID');
  });

  it('rejects hidden apartment fields on a House', () => {
    expect(mapWhatsAppQuoteFlowV1(session({ ...validResponse(), apartment_floor:'3' })).kind).toBe('INVALID');
  });

  it('rejects unknown options rather than coercing them', () => {
    expect(mapWhatsAppQuoteFlowV1(session({ ...validResponse(), primary_service:'MAGIC_CLEAN' })).kind).toBe('INVALID');
  });

  it('routes Not sure to human review without guessing a service', () => {
    const response = { ...validResponse(), primary_service:'NOT_SURE', frequency_deep:undefined, frequency_simple:'ONE_TIME', service_not_sure_details:'I need help choosing' };
    delete (response as any).frequency_deep;
    expect(mapWhatsAppQuoteFlowV1(session(response)).kind).toBe('HUMAN_REVIEW');
  });

  it('routes unresolved PhotoPicker evidence to human review', () => {
    expect(mapWhatsAppQuoteFlowV1(session({ ...validResponse(), quote_photos:[{ id:'provider-handle' }] })).kind).toBe('HUMAN_REVIEW');
  });
});
