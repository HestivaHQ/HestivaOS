# Messaging Quote Review & Correction v1

Status: IMPLEMENTED on the review branch; canonical only after merge.

## Purpose

Complete the deterministic customer-facing Messaging Quote loop after canonical fact collection and before authoritative Quote submission.

## Review

When all required Messaging Quote fact groups validate, the existing durable REVIEW state presents a deterministic summary. The summary includes the primary service, frequency/home condition where present, property/address, preferred visit, selected access/household indicators, and explicit customer contact details.

The customer has two exact control replies:

- `CONFIRM` — preserves the existing strict authorization boundary and proceeds through durable confirmation and the authoritative Messaging Quote submission runtime.
- `CHANGE` — opens the deterministic correction menu. Ordinary conversational variants do not authorize submission or silently mutate facts.

## Correction

The correction menu is context-bound to durable provider `ACCEPTED` evidence before a numeric selection can be interpreted. The customer can restart one bounded section:

1. Home / property
2. Cleaning service and personalisation
3. Preferred visit
4. Access and household
5. Safety, notes and photos
6. Customer details

Selecting a section deliberately clears only the corresponding in-progress top-level fact group or groups. The existing `updateDraft` transition invalidates the stale review/confirmation evidence and returns the Quote to `COLLECTING`. The normal deterministic guided collectors then ask that section again and preserve all unrelated sections.

For Cleaning service and personalisation, the complete `request` group is recollected so a changed primary service cannot retain incompatible frequency, add-on, Laundry/Ironing, or Post-Event facts from the prior choice.

Correction-menu delivery evidence is tied to the current Quote-state version. A stale menu from an earlier review version cannot authorize mutation of a newer review snapshot.

## Safety and authority

- No AI or arbitrary free-text semantic extraction is introduced.
- A correction selection is not interpreted until the exact correction prompt has accepted-delivery evidence.
- Invalid correction selections do not mutate Quote state.
- `CONFIRM` remains exact uppercase authorization.
- Submitted Quotes remain immutable through Messaging draft mutation and must use the canonical Quote revision path.
- Provider identity is not treated as canonical Customer identity.
- Provider media is still not fabricated into canonical Quote photos; the ADR-0081 secure media-to-Quote bridge remains separate work.
- HestivaOS canonical Quote validation, pricing and submission remain authoritative.
