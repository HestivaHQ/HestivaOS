# ADR-0026: Separate recurring service agreements from visit Work Orders

- Status: Accepted
- Date: 2026-08-11

## Context

A Work Order is one operational visit and its accepted values must remain historical. Frequency on that record cannot safely represent the changing lifecycle and generation state of an ongoing service commitment.

## Decision

Use `RecurringServiceAgreement` as the Property-owned recurring commitment and `RecurringServiceAgreementAddOn` for canonical add-ons. Customer ownership is derived through Property. Generated Work Orders snapshot the agreement's Service, add-ons, frequency, and recurring instructions and retain a nullable agreement link plus calendar occurrence date.

Standard recurrence is structured: weekly and every-two-weeks use a controlled weekday, with the effective date anchoring alternating weeks; monthly uses day 1–31 and clamps to the month's final valid day. Calendar decisions use `Africa/Johannesburg`. Prose-only CUSTOM agreements require a note and never auto-generate.

Generation is explicit, transactionally creates at most one upcoming Work Order when none already exists, and uses the normal immutable reference counter. A database unique constraint on agreement and occurrence date is the concurrency authority. Past missed/paused occurrences are skipped. Agreement edits and lifecycle changes never mutate or delete generated visits.

## Consequences

Recurring records are operationally inspectable without becoming payment subscriptions. ACTIVE records may generate; PAUSED, CANCELLED, CUSTOM, and elapsed agreements do not. Resume calculates from the current business date and does not create backlog. Customer cleanup deletes agreement-owned rows after its Work Orders while preserving canonical Services.

The accepted-quote handoff (5M), recurring assignment preferences/multi-assignment (5N), and broader operational fields (5O) remain separate work.
