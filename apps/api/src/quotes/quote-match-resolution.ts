import type { Customer, Property } from '@prisma/client';
import type { CustomerInput, PropertyInput } from './website-quote-contract';

export type MatchState = 'EXACT_EXISTING_MATCH' | 'LIKELY_MATCH_REVIEW_REQUIRED' | 'NO_MATCH_NEW_CANDIDATE' | 'AMBIGUOUS_MULTIPLE_MATCHES' | 'INVALID_OR_INSUFFICIENT_IDENTITY_DATA';
export type MatchCandidate = { id: string; displayName: string; evidence: string[]; context?: string };
export type MatchResult = { state: MatchState; readiness: 'READY' | 'REVIEW_REQUIRED' | 'BLOCKED'; candidates: MatchCandidate[] };

export const normalizeCustomerEmail = (value?: string | null) => value?.trim().toLowerCase() || null;
export const normalizeCustomerPhone = (value?: string | null) => value?.trim() || null;
const normalizedText = (value?: string | null) => value?.trim().toLocaleLowerCase('en-ZA').replace(/\s+/g, ' ') || null;
export const normalizePropertyAddress = (property: Pick<PropertyInput, 'addressLine1' | 'suburb' | 'postalCode' | 'country'> | Pick<Property, 'addressLine1' | 'city' | 'postalCode' | 'country'>) => [
  normalizedText(property.addressLine1),
  normalizedText('suburb' in property ? property.suburb : property.city),
  normalizedText(property.postalCode),
  normalizedText(property.country),
].join('|');

export function resolveCustomerMatch(input: CustomerInput, customers: Array<Pick<Customer, 'id' | 'name' | 'contactName' | 'email' | 'phone'>>): MatchResult {
  const email = normalizeCustomerEmail(input.email), phone = normalizeCustomerPhone(input.mobile);
  if (!email && !phone) return { state: 'INVALID_OR_INSUFFICIENT_IDENTITY_DATA', readiness: 'BLOCKED', candidates: [] };
  const matches = customers.map((customer) => {
    const evidence: string[] = [];
    if (email && normalizeCustomerEmail(customer.email) === email) evidence.push('EMAIL');
    if (phone && normalizeCustomerPhone(customer.phone) === phone) evidence.push('MOBILE');
    return { customer, evidence };
  }).filter(({ evidence }) => evidence.length);
  const candidates = matches.map(({ customer, evidence }) => ({ id: customer.id, displayName: customer.contactName?.trim() || customer.name, evidence, context: [customer.email, customer.phone].filter(Boolean).join(' · ') }));
  if (!matches.length) return { state: 'NO_MATCH_NEW_CANDIDATE', readiness: 'READY', candidates: [] };
  if (matches.length > 1) return { state: 'AMBIGUOUS_MULTIPLE_MATCHES', readiness: 'REVIEW_REQUIRED', candidates };
  const bothSupplied = Boolean(email && phone);
  const bothMatch = matches[0].evidence.length === 2;
  return { state: bothSupplied && !bothMatch ? 'LIKELY_MATCH_REVIEW_REQUIRED' : 'EXACT_EXISTING_MATCH', readiness: bothSupplied && !bothMatch ? 'REVIEW_REQUIRED' : 'READY', candidates };
}

export function resolvePropertyMatch(input: PropertyInput, properties: Array<Pick<Property, 'id' | 'name' | 'addressLine1' | 'city' | 'postalCode' | 'country'>>): MatchResult {
  if (!input.addressLine1?.trim() || !input.suburb?.trim()) return { state: 'INVALID_OR_INSUFFICIENT_IDENTITY_DATA', readiness: 'BLOCKED', candidates: [] };
  const address = normalizePropertyAddress(input);
  const matches = properties.filter((property) => normalizePropertyAddress(property) === address);
  const candidates = matches.map((property) => ({ id: property.id, displayName: `${property.name} — ${property.addressLine1}, ${property.city}`, evidence: ['ADDRESS'], context: [property.postalCode, property.country].filter(Boolean).join(' · ') }));
  if (!matches.length) return { state: 'NO_MATCH_NEW_CANDIDATE', readiness: 'READY', candidates: [] };
  if (matches.length > 1) return { state: 'AMBIGUOUS_MULTIPLE_MATCHES', readiness: 'REVIEW_REQUIRED', candidates };
  return { state: 'EXACT_EXISTING_MATCH', readiness: 'READY', candidates };
}
