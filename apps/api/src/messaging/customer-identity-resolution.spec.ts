import { describe, expect, it } from '@jest/globals';
import { resolveCustomerMessagingIdentity } from './customer-identity-resolution';

describe('resolveCustomerMessagingIdentity', () => {
  it('returns UNLINKED when no trusted explicit identity exists', () => {
    expect(resolveCustomerMessagingIdentity({
      candidates: [
        { customerId: 'customer-a', contactId: 'contact-a', trusted: false, explicitLink: true },
        { customerId: 'customer-a', contactId: 'contact-a', trusted: true, explicitLink: false },
      ],
    })).toEqual({ kind: 'UNLINKED' });
  });

  it('matches one trusted explicit Customer/contact relationship', () => {
    expect(resolveCustomerMessagingIdentity({
      candidates: [
        { customerId: 'customer-a', contactId: 'contact-a', trusted: true, explicitLink: true },
      ],
    })).toEqual({
      kind: 'MATCHED',
      customerId: 'customer-a',
      contactId: 'contact-a',
    });
  });

  it('allows multiple identities/contact rows that still resolve to the same Customer', () => {
    expect(resolveCustomerMessagingIdentity({
      candidates: [
        { customerId: 'customer-a', contactId: 'contact-a', trusted: true, explicitLink: true },
        { customerId: 'customer-a', contactId: 'contact-b', trusted: true, explicitLink: true },
      ],
    }).kind).toBe('MATCHED');
  });

  it('fails closed when the same provider identity points to multiple Customers', () => {
    expect(resolveCustomerMessagingIdentity({
      candidates: [
        { customerId: 'customer-b', contactId: 'contact-b', trusted: true, explicitLink: true },
        { customerId: 'customer-a', contactId: 'contact-a', trusted: true, explicitLink: true },
      ],
    })).toEqual({
      kind: 'AMBIGUOUS',
      customerIds: ['customer-a', 'customer-b'],
    });
  });

  it('does not silently move a known identity to a different requested Customer', () => {
    expect(resolveCustomerMessagingIdentity({
      candidates: [
        { customerId: 'customer-a', contactId: 'contact-a', trusted: true, explicitLink: true },
      ],
      requestedCustomerId: 'customer-b',
    })).toEqual({
      kind: 'CONFLICT',
      linkedCustomerId: 'customer-a',
      requestedCustomerId: 'customer-b',
    });
  });
});
