import { describe, expect, it } from '@jest/globals';
import { resolveCustomerMatch, resolvePropertyMatch } from './quote-match-resolution';

const customerInput = { fullName: 'Alex Smith', email: 'Alex@Example.com', mobile: '+27821234567', preferredContact: 'EMAIL' as const };
const customer = (id: string, email: string | null, phone: string | null, name = 'Alex Smith') => ({ id, name, contactName: name, email, phone });
const propertyInput = { addressLine1: ' 1 MAIN Road ', suburb: ' Durban ', postalCode: '4001', country: 'South Africa' as const } as any;
const property = (id: string) => ({ id, name: 'Home', addressLine1: '1 Main Road', city: 'Durban', postalCode: '4001', country: 'South Africa' });

describe('Quote customer match resolution', () => {
  it('returns an exact match for one canonical email and mobile match', () => expect(resolveCustomerMatch(customerInput, [customer('one', 'alex@example.com', '+27821234567')]).state).toBe('EXACT_EXISTING_MATCH'));
  it('returns a new candidate when identifiers do not match', () => expect(resolveCustomerMatch(customerInput, []).state).toBe('NO_MATCH_NEW_CANDIDATE'));
  it('fails ambiguous when identifiers identify multiple records', () => expect(resolveCustomerMatch(customerInput, [customer('one', 'alex@example.com', null), customer('two', null, '+27821234567')]).state).toBe('AMBIGUOUS_MULTIPLE_MATCHES'));
  it('does not identify by name alone', () => expect(resolveCustomerMatch(customerInput, [customer('one', null, null)]).state).toBe('NO_MATCH_NEW_CANDIDATE'));
  it('requires review when only one of two supplied identifiers matches', () => expect(resolveCustomerMatch(customerInput, [customer('one', 'alex@example.com', '+27820000000')]).state).toBe('LIKELY_MATCH_REVIEW_REQUIRED'));
});

describe('Quote Property match resolution', () => {
  it('matches one normalized exact address', () => expect(resolvePropertyMatch(propertyInput, [property('one')]).state).toBe('EXACT_EXISTING_MATCH'));
  it('returns a new candidate when no address matches', () => expect(resolvePropertyMatch(propertyInput, []).state).toBe('NO_MATCH_NEW_CANDIDATE'));
  it('requires review for duplicate exact addresses', () => expect(resolvePropertyMatch(propertyInput, [property('one'), property('two')]).state).toBe('AMBIGUOUS_MULTIPLE_MATCHES'));
  it('ignores visit-specific information because it is outside Property identity', () => expect(resolvePropertyMatch({ ...propertyInput, access: { securityInstructions: 'today only' } } as any, [property('one')]).state).toBe('EXACT_EXISTING_MATCH'));
});
