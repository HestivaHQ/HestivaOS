# Website enquiry reference authority

**Status:** Implemented in HestivaOS by the Website enquiry ingestion slice; Website consumer cutover remains a coordinated follow-up after deployment.

## Decision

HestivaOS is the authoritative system for Website contact enquiries that require a durable reference.

- Website contact enquiries must not invent or persist their own authoritative enquiry sequence.
- HestivaOS issues the human-readable enquiry reference after successful guarded ingestion.
- The enquiry reference format is `ENQ-YYYYMMDD-NNNN`, where the date is the Africa/Johannesburg business date and the sequence is a zero-padded daily counter.
- The Website may display and email the `ENQ-...` reference only after HestivaOS acknowledges the enquiry and returns that authoritative reference.
- Failed HestivaOS ingestion must not be reported to the customer as a successfully accepted enquiry.

## HestivaOS runtime contract

`POST /api/v1/integrations/website/enquiries` is a public transport endpoint protected by the same server-side Website integration authorization boundary used by Website Quote ingestion. The Website integration secret remains server-only and must never be exposed to browser code.

The v1 request schema is `website-enquiry.v1` and contains:

- `schemaVersion` — exactly `website-enquiry.v1`;
- `submissionId` — Website-generated UUID used only as the immutable transport/idempotency identity;
- `submittedAt` — ISO date-time for the customer submission;
- `name`;
- `phone`;
- `email`;
- `enquiryType` — one of `Request a Quote`, `General Enquiry`, `Existing Booking`, `Service Area Check`, or `Feedback`;
- `propertyAddress` — the current Website contact-form suburb/address value;
- `description`;
- `preferredContact`.

Unknown fields and unsupported enquiry types fail closed. HestivaOS persists the accepted structured submission together with normalized searchable fields and a SHA-256 fingerprint of the immutable submitted payload.

A successful acknowledgement returns:

- `schemaVersion`;
- `submissionId`;
- `enquiryId`;
- `enquiryReference`;
- `created`;
- `replay`.

An identical retry with the same `submissionId` returns the already allocated `enquiryReference` and does not create another enquiry or consume another authoritative reference. Reuse of the same `submissionId` with changed immutable content returns a conflict. Concurrent duplicate creation is reconciled through the unique submission identity and the same fingerprint rule.

Reference allocation and enquiry creation occur in one serializable transaction. The daily sequence is capped at 9,999 accepted enquiries per Johannesburg business date; exhaustion fails without reporting a successful intake.

## Current Website state and required follow-up

The Website contact form still delivers contact enquiries by email and currently creates its own presentation reference. It must not switch to the new OS endpoint until this HestivaOS slice is merged, deployed and verified.

After OS support is deployed, the Website should:

- create one stable UUID `submissionId` for an attempted contact submission and reuse it for safe retries of the same immutable submission;
- submit the contact enquiry to HestivaOS before reporting successful intake;
- require a valid returned `ENQ-...` reference;
- include that reference in the customer confirmation and Admin enquiry email;
- stop inventing a separate Website-local enquiry reference for contact enquiries;
- retain `info@homent.co.za` as the contact-enquiry sender/reply-to identity;
- keep Quote submission and Quote reference authority unchanged.

## Coordination source

This contract belongs to `HestivaHQ/HestivaOS#73` because it changes the Website ↔ HestivaOS integration contract and reference authority. PR #149 is the HestivaOS implementation slice.