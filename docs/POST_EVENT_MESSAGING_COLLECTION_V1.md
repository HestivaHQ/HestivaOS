# Post-Event Messaging Collection v1

## Status

Implemented on top of the generic guided Cleaning Requirements flow from PR #204 and the live Post-Event collection merged through PR #205.

The live WhatsApp/Messenger Quote conversation can select `Post-Event Cleaning`, enforces `ONE_TIME`, and deterministically collects the approved Post-Event event/venue context and workload/review facts.

The canonical submission blocker identified during PR #205 is now resolved by a channel-neutral Quote business-fact validator. Messaging no longer needs to pretend a Post-Event draft is a Website-supported service in order to determine completeness or submit it. Website Quote Contract v2 remains unchanged and continues to govern Website transport exactly as before.

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

## Canonical submission boundary

`validateQuoteBusinessFacts` is the channel-neutral validation entry point for Messaging Quote business facts.

Existing Website-compatible facts still reuse the mature Website v2 field-validation surface. For Post-Event Cleaning, common customer/property/request/visit/access/household/safety/notes/photo facts are validated through a validation-only projection, while the real Post-Event service identity, once-off frequency and structured Post-Event facts are validated explicitly. The projection is never returned, persisted, priced or treated as provenance.

Messaging completeness and final submission both use this same boundary. A complete confirmed Post-Event draft can therefore reach the authoritative Quote submission service without broadening Website v2, impersonating Website provenance or routing through Website authentication.
