# ADR-0087: Separate Customer accounts, contacts, properties, and messaging identities

- **Status:** Accepted
- **Date:** 2026-08-21
- **Decision owners:** Hestiva
- **Related coordination:** HestivaOS Issue #116

## Context

HestivaOS already allows one Customer to own multiple Properties, but the current Customer record still carries only one primary contact name, email, and phone, while a MessagingConversation links directly to one Customer.

That is too narrow for real operations. Hestiva may serve private customers, landlords, property owners, estate agents, agencies, companies, body corporates, or other account holders that control many properties. The person messaging Hestiva may be the Customer, an employee, spouse, tenant, property manager, estate agent, assistant, family member, or another authorised representative. A Customer or representative may also use more than one WhatsApp number or Messenger identity, and phone numbers can change over time.

Treating a phone number or provider account as the Customer identity would create unsafe automatic matching, duplicate Customer records, incorrect Quote ownership, and poor auditability.

## Decision

HestivaOS will treat the following as separate concepts:

1. **Customer account** — the person, business, organisation, landlord, agency, or other account holder that owns the commercial relationship.
2. **Customer contact** — a human being who may communicate for that Customer account. One Customer account may have many contacts.
3. **Property** — a service location. One Customer account may have many Properties.
4. **Messaging identity** — a channel/provider identity such as a WhatsApp phone identity or Messenger PSID. One contact may have multiple messaging identities over time.

A messaging identity must never be treated as proof of Customer ownership merely because its phone number or display information resembles a Customer record.

Automatic linking is allowed only when a messaging identity is already uniquely and explicitly linked to a Customer/contact relationship with sufficient trust. New, changed, conflicting, or ambiguous identities must fail closed into an identification or human-review path rather than guessing.

A contact may act on behalf of a Customer without becoming the Customer. Quote, Property, Work Order, Recurring Service Agreement, Finance, and other commercial/operational ownership remains with the Customer account unless an authoritative workflow explicitly changes it.

Changing a phone number does not erase the historical identity. Old identities may be retired while retaining immutable history. Multiple active identities may coexist for the same contact when legitimate.

The model must support individual and organisation Customer accounts without assuming that `Customer.name` is always a person's name. Existing Customer/Property records remain valid during migration; the new contact/identity layer is additive and must preserve history.

## Matching rules

Identity resolution must produce one of four outcomes:

- **MATCHED** — one trusted Customer/contact relationship is known and may be used automatically.
- **UNLINKED** — the provider identity is new and must go through identification/linking.
- **AMBIGUOUS** — more than one plausible Customer/contact relationship exists; human review is required.
- **CONFLICT** — the identity is explicitly linked in a way that conflicts with the requested Customer/account context; automatic reassignment is forbidden.

Phone number similarity, customer name similarity, email similarity, property address similarity, or customer-supplied claims may be used as discovery hints, but not as sole authority for automatic relinking.

## Consequences

### Positive

- Companies, agencies, landlords, and private customers can all own many Properties cleanly.
- Multiple people can communicate for one Customer without creating duplicate Customer accounts.
- Customers can change numbers or use multiple WhatsApp accounts without losing history.
- Messaging can safely identify who is speaking separately from who owns the Quote/job.
- Ambiguous or conflicting cases fail closed instead of silently attaching work to the wrong Customer.

### Trade-offs

- Customer management becomes more structured than the current single-contact fields.
- Migration must preserve existing `contactName`, `email`, and `phone` values as initial contact data where present.
- Admin UI will need a clear way to manage Customer type, contacts, their roles/relationships, Properties, messaging identities, trust state, and retired identities.

## Implementation order

1. Lock deterministic identity-resolution rules and tests.
2. Add durable Customer contact and messaging identity persistence with an additive migration.
3. Backfill existing Customer contact fields into the new layer without deleting the historical fields immediately.
4. Update Messaging linking to use the new identity layer.
5. Add automatic matching only for uniquely trusted identities; ambiguous cases go to human review.
6. Update Customer/Admin UI for individual/organisation accounts, contacts, identities, and multi-property management.
7. Resume automatic Messaging Quote creation using resolved Customer/contact/property context.

Until durable contact and messaging-identity persistence is merged, the existing direct `MessagingConversation.customerId` link remains a compatibility path only and must not be expanded into similarity-based automatic matching.

## Out of scope for this ADR

- Customer-record merge semantics and reversal rules.
- Automatic authority to change a Customer's legal/commercial owner based only on a message.
- AI-based identity decisions.
- Silent reassignment of an existing messaging identity between Customers.
