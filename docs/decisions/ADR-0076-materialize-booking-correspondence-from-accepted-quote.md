# ADR-0076: Materialize booking correspondence from accepted Quote state

## Status

Accepted

## Context

Phase 2 requires an authoritative booking/appointment-confirmation transition before Correspondence can integrate booking communication safely. The merged Quote acceptance runtime already provides that boundary: successful ADMIN acceptance runs in one serializable transaction that resolves the canonical Customer and Property, creates the operational Work Order, records `WORK_ORDER_CREATED`, and transitions the Quote from `SUBMITTED` to `ACCEPTED` with `acceptedAt`, `acceptedByUserId`, `acceptedRevisionId`, and the exact `workOrderId` link.

There is no narrower persisted appointment-confirmation transition after Quote acceptance. Treating arbitrary Work Order creation as booking confirmation would be too broad because Work Orders can exist outside accepted customer Quotes.

ADR-0074 still requires a separate human-created delivery attempt before any customer-facing send, and there is still no approved global event-to-template binding or placeholder vocabulary.

## Decision

The authoritative booking event for Quote-originated bookings is the successful atomic Quote acceptance transition linked to the Work Order created by that same acceptance transaction.

An ADMIN may materialize one booking Correspondence record for a Work Order only when its `sourceQuote`:

- exists and is linked back to that exact Work Order;
- is currently `ACCEPTED`;
- has persisted `acceptedAt`, `acceptedByUserId`, and `acceptedRevisionId` facts.

The integration:

- accepts an explicitly selected published Correspondence template version;
- reads canonical Customer recipient fields and booking facts server-side;
- snapshots the Quote acceptance identity, linked Work Order identity, scheduled/recurrence date, preferred time window, and frequency into immutable Correspondence provenance;
- uses the stable source-event key `quote.accepted.v1:<quoteId>`;
- serializes materialization per source-event key with a PostgreSQL transaction advisory lock;
- returns the existing immutable record when the same accepted Quote event is materialized again;
- does not treat standalone Work Order creation as booking confirmation;
- does not create a delivery attempt, call a provider, retry, or send anything.

The selected template must already be `PUBLISHED`. Subject/body remain verbatim because placeholder semantics are still unapproved.

## Consequences

Quote acceptance remains authoritative for whether a Quote-originated booking exists. Work Order remains authoritative for the resulting operational appointment facts. Correspondence records the exact immutable communication output and provenance without becoming a second booking authority.

The booking bridge covers both one-time and recurring Quote acceptance because both paths create and link the initial Work Order atomically. Later recurring Work Orders are not implicitly treated as new Quote-acceptance events.

The ADMIN who materializes booking correspondence has not approved delivery. ADR-0074 still requires a separate ADMIN-created delivery attempt for the exact immutable record.

Reschedule and cancellation integrations remain separate slices and must use their own verified authoritative transition identities.

## Rejected alternatives

- **Use every `WORK_ORDER_CREATED` activity as booking confirmation.** Rejected because Work Orders may be created outside accepted customer Quotes.
- **Create booking correspondence automatically inside Quote acceptance.** Rejected because no event-to-template binding is approved and this slice preserves explicit ADMIN materialization.
- **Create a delivery attempt automatically after Quote acceptance.** Rejected because it bypasses ADR-0074.
- **Add a second booking-confirmed flag solely for Correspondence.** Rejected because the existing atomic accepted-Quote-to-Work-Order link already persists the authoritative transition facts.
