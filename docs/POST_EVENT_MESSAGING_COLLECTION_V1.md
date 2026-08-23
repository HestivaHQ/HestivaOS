# Post-Event Messaging Collection v1

## Status

Implemented in the current Post-Event Messaging collection slice on top of the generic guided Cleaning Requirements flow from PR #204.

The live WhatsApp/Messenger Quote conversation can select `Post-Event Cleaning`, enforces `ONE_TIME`, and deterministically collects the approved Post-Event event/venue context and workload/review facts.

This slice does **not** claim Post-Event Messaging submission is complete. The current Messaging submission boundary still reuses Website Quote Contract v2 validation, and Website v2 does not yet recognize Post-Event Cleaning. A separate canonical validation/submission-boundary slice is required before a completed Post-Event Messaging draft can become an authoritative Quote.

Coordination source: Issue #116.

## Collected facts

Post-Event collection persists:

- event type;
- venue type;
- guest band;
- exact bathrooms used;
- substantial kitchen use;
- dishwashing level;
- concrete outdoor event-area subtypes;
- ordinary waste level;
- significant ordinary soiling;
- late-night/overnight requirement;
- bulk/off-site waste-removal request;
- specialist contamination;
- specialist carpet/upholstery treatment;
- complex venue indicator.

Event type and venue type are retained as non-pricing Quote context. The remaining facts feed the existing deterministic Post-Event workload/review model.

## Deterministic interaction rules

- Post-Event is a real primary service in Messaging, not an add-on or free-text interpretation.
- Frequency is once-off only.
- Categorical answers use bounded numbered menus.
- Boolean answers require exact `YES` or `NO`.
- Bathroom count must be an exact positive whole number in the supported collection range.
- Outdoor areas accept `0` for none or unique comma-separated supported area numbers.
- Arbitrary prose is not interpreted into multiple Quote facts.
- Review-triggering facts are stored explicitly rather than hidden or guessed away.

## Durable prompt protection

The Post-Event live flow reuses the same safety rule as Home and generic Cleaning Requirements: an inbound menu-like answer is not interpreted unless the exact current outbound question has first been durably accepted by the provider.

Post-Event prompt/retry identities use their own stable idempotency-key namespace so retries cannot silently mutate a different immutable outbound message.

## Review-triggering facts

The collector intentionally permits customers to state facts that later force review, including:

- 150+ guests;
- overnight work;
- bulk/off-site waste removal;
- specialist contamination;
- specialist carpet/upholstery treatment;
- large or operationally complex venues.

The existing Post-Event operating model remains authoritative for whether automatic pricing is allowed.

## Remaining boundary

Before Post-Event Messaging can submit a canonical Quote, HestivaOS needs a channel-neutral business-fact validation path that accepts the approved internal Post-Event extension without broadening the existing Website v2 transport contract by accident.

The follow-up must keep HestivaOS Quote validation/pricing authoritative and must not impersonate Website provenance or route Messaging through Website authentication.
