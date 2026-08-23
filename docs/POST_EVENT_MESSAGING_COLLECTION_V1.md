# Post-Event Cleaning — Messaging collection v1

## Status

Implementation foundation for deterministic Post-Event Cleaning collection in the Homent WhatsApp/Messenger Quote workflow.

This slice does **not** claim that the live Messaging orchestrator can yet select Post-Event Cleaning from `CLEANING_REQUIREMENTS`. PR #201 implemented only the guided `YOUR_HOME` section. The generic Cleaning Requirements dispatcher/service-selection path remains a separate follow-up and must invoke this collector only after the canonical primary service is `Post-Event Cleaning`.

## Authority

`docs/POST_EVENT_CLEANING_V1.md` remains the product/business authority. HestivaOS remains the sole Quote validation, workload, pricing and profitability authority.

Messaging may collect and persist approved Post-Event facts but must not calculate prices or infer missing workload facts from arbitrary prose.

## Canonical Messaging facts

For Post-Event Cleaning, `MessagingQuoteDraft.request.postEvent` may retain:

- event type;
- venue type;
- guest band;
- exact bathroom count used by the event;
- whether the kitchen was substantially used;
- dishwashing workload;
- concrete outdoor-area subtypes;
- waste level;
- significant ordinary soiling;
- late-night/overnight requirement;
- bulk/off-site waste-removal request;
- specialist/hazardous contamination flag;
- specialist carpet/upholstery requirement; and
- large/complex venue flag.

Event type and venue type are retained as customer/operational context and do not directly change the approved v1 price formula. The remaining workload facts are consumed by the existing canonical Post-Event operating model after the normal Property floor-size fact is available.

## Deterministic collection rules

The collector uses bounded numbered choices or exact `YES` / `NO` answers. It does not parse natural-language descriptions into multiple structured facts.

Outdoor areas accept `0` for none or a comma-separated set of unique approved subtype numbers. The collector rejects unknown or duplicate subtype numbers rather than guessing intent.

Exact bathrooms must be a whole number from 1 to 20 in this first Messaging collector. Values outside that bounded input are rejected rather than converted from the generic Property `FIVE_PLUS` bucket.

## Review-producing facts

The collector intentionally persists review-triggering answers instead of hiding or rewriting them. Examples include:

- 150+ guests;
- late-night/overnight work;
- bulk waste transport;
- specialist contamination;
- specialist carpet/upholstery treatment; and
- a large/complex venue.

The existing Post-Event operating model remains responsible for turning those facts into deliberate review / `NEEDS_ATTENTION`. Messaging itself does not decide a commercial outcome.

## Follow-up integration

The next Messaging slice must provide the generic `CLEANING_REQUIREMENTS` service-selection/request dispatcher. Once that dispatcher has canonically selected `Post-Event Cleaning`, it can call `nextMessagingGuidedPostEventQuestion` / `applyMessagingGuidedPostEventAnswer` using the same durable prompt-acceptance and idempotency protections already established for guided Home collection.

Website transport remains unchanged by this slice.
