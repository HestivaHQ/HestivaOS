# Post-Event Messaging Collection v1

## Status

Implemented in the current Post-Event Messaging collection slice on top of the generic guided Cleaning Requirements flow from PR #204.

The live WhatsApp/Messenger Quote conversation can select `Post-Event Cleaning`, enforces `ONE_TIME`, and deterministically collects the approved Post-Event event/venue context and workload/review facts.

Post-Event Messaging submission now uses the shared channel-neutral Quote business-fact validator. A completed and confirmed Post-Event Messaging draft can therefore become an authoritative Quote without routing through Website transport validation or impersonating Website provenance.

This is an internal validation-boundary implementation within the already-authoritative Quote domain; it does not change component/domain ownership, runtime topology, cross-domain authority, or the Website transport boundary.

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

## Submission boundary

Messaging validates completed business facts through the channel-neutral Quote validation boundary. Ordinary Website-compatible facts continue to use the mature v2 field-validation rules internally, while Post-Event uses its approved canonical service mapping, once-off rule and structured fact validation.

The Website v2 transport contract itself remains unchanged. Messaging does not use the Website route, Website bearer secret, Website submission identity or Website provenance, and HestivaOS remains the single Quote validation/pricing authority. The temporary validation-only projection used to reuse mature field checks is never persisted or exposed as transport identity.
