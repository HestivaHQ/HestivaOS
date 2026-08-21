export type CustomerIdentityCandidate = {
  customerId: string;
  contactId?: string | null;
  trusted: boolean;
  explicitLink: boolean;
};

export type CustomerIdentityResolution =
  | {
      kind: 'MATCHED';
      customerId: string;
      contactId: string | null;
    }
  | {
      kind: 'UNLINKED';
    }
  | {
      kind: 'AMBIGUOUS';
      customerIds: string[];
    }
  | {
      kind: 'CONFLICT';
      linkedCustomerId: string;
      requestedCustomerId: string;
    };

/**
 * Resolve only durable, explicit messaging-identity links automatically.
 * Discovery hints (similar phone/name/email/address) must be handled outside
 * this function and may never create automatic authority by themselves.
 */
export function resolveCustomerMessagingIdentity(input: {
  candidates: CustomerIdentityCandidate[];
  requestedCustomerId?: string | null;
}): CustomerIdentityResolution {
  const trustedExplicit = input.candidates.filter(
    (candidate) => candidate.trusted && candidate.explicitLink,
  );

  const uniqueByCustomer = new Map<string, CustomerIdentityCandidate>();
  for (const candidate of trustedExplicit) {
    if (!uniqueByCustomer.has(candidate.customerId)) {
      uniqueByCustomer.set(candidate.customerId, candidate);
    }
  }

  if (uniqueByCustomer.size === 0) {
    return { kind: 'UNLINKED' };
  }

  if (uniqueByCustomer.size > 1) {
    return {
      kind: 'AMBIGUOUS',
      customerIds: [...uniqueByCustomer.keys()].sort(),
    };
  }

  const matched = [...uniqueByCustomer.values()][0];
  const requestedCustomerId = input.requestedCustomerId ?? null;

  if (requestedCustomerId && requestedCustomerId !== matched.customerId) {
    return {
      kind: 'CONFLICT',
      linkedCustomerId: matched.customerId,
      requestedCustomerId,
    };
  }

  return {
    kind: 'MATCHED',
    customerId: matched.customerId,
    contactId: matched.contactId ?? null,
  };
}
