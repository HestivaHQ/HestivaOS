# Website enquiry reference authority

**Status:** Approved cross-system decision; implementation not yet present in HestivaOS.

## Decision

HestivaOS will be the authoritative system for Website contact enquiries that require a durable reference.

- Website contact enquiries must not invent or persist their own authoritative enquiry sequence.
- HestivaOS will issue the human-readable enquiry reference after successful guarded ingestion.
- The approved enquiry reference namespace is `ENQ`.
- The exact final sequence shape beyond the `ENQ` prefix is an HestivaOS implementation detail and must follow the existing human-readable reference conventions used by HestivaOS.
- The Website may display and email the `ENQ-...` reference only after HestivaOS acknowledges the enquiry and returns that authoritative reference.
- Failed HestivaOS ingestion must not be reported to the customer as a successfully accepted enquiry.

## Current state

The Website contact form currently delivers contact enquiries by email and has separate contact-specific sender/template behavior.

HestivaOS currently has an implemented guarded Website Quote ingestion boundary and authoritative Quote reference generation, but it does not yet expose a Website enquiry ingestion endpoint or enquiry-reference domain.

Therefore `ENQ-...` references are **not implemented yet**. The Website must not add a temporary local numbering mechanism while the HestivaOS capability is absent.

## Required HestivaOS follow-up

The HestivaOS implementation slice should define and implement:

1. a guarded Website enquiry ingestion endpoint;
2. a durable enquiry/intake record or equivalent authoritative domain object;
3. idempotency and retry behavior suitable for Website submissions;
4. authoritative human-readable `ENQ-...` reference allocation;
5. an acknowledgement response that returns the enquiry reference to the Website;
6. validation/security rules consistent with the existing Website integration boundary;
7. tests proving duplicate retries cannot allocate multiple enquiry references for the same accepted submission;
8. documentation of the final payload/response contract for the Website repository.

## Website follow-up after OS support exists

Once the HestivaOS enquiry endpoint is implemented and deployed, the Website should:

- submit contact enquiries to HestivaOS before reporting successful intake;
- require a valid returned `ENQ-...` reference;
- include that reference in the customer confirmation and Admin enquiry email;
- retain `info@homent.co.za` as the contact-enquiry sender/reply-to identity;
- keep Quote submission and Quote reference authority unchanged.

## Coordination source

This decision belongs to `HestivaHQ/HestivaOS#73` because it changes the Website ↔ HestivaOS integration contract and reference authority.