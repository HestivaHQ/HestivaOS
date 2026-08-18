# ADR-0049: Reuse canonical Quote capture and privacy retention for messaging

## Status

Accepted — 2026-08-18

Coordination source: `HestivaHQ/HestivaOS#116`.

## Context

Homent's live Website and HestivaOS already define the customer information required for residential cleaning Quote capture, the canonical structured Quote contract, conditional validation, pricing authority, operational ownership and published privacy-retention periods.

Creating a separate WhatsApp/Messenger questionnaire or separate chat-retention schedule would duplicate business decisions that already exist and would create drift between Website, messaging and HestivaOS.

The live Website presents eight customer-facing Quote sections: Your Home, Cleaning Requirements, Personalise Your Service, Preferred Visit, Access and Household Details, Photos and Notes, Your Details, and Review and Submit. HestivaOS Website Quote Contract v2 carries the corresponding canonical structured fact groups and current rules, including structured Laundry/Ironing.

The published Homent Privacy Policy states that general or unsuccessful enquiries are normally retained for up to 12 months; quotation, customer and service communications are normally retained for up to 3 years after the last interaction or service; temporary property-access information is deleted as soon as reasonably possible after it is no longer needed; statutory records follow their applicable legal periods.

## Decision

Messaging will follow a **reuse before invention** rule.

For Quote capture:

- WhatsApp and Messenger use the same customer-information requirements as the live Website Quote flow.
- Messaging reuses the HestivaOS Quote Contract v2 business fact groups and validation semantics rather than defining a messaging-only Quote schema.
- The conversational order may adapt when a customer volunteers information early, but completion must resolve the same canonical Quote facts before HestivaOS performs a consequential Quote action.
- Messaging does not reuse Website transport identity, Website provenance, Website submission IDs, Website authentication credentials or the Website ingestion endpoint.
- Website and messaging remain separate channel adapters around the same authoritative HestivaOS Quote domain.

For retention:

- general/abandoned messaging enquiries inherit the up-to-12-month enquiry lifecycle;
- messaging that becomes quotation/customer/service communication inherits the up-to-3-year lifecycle measured from the last interaction or service;
- temporary access information is deleted as soon as reasonably possible after it is no longer needed;
- legally required financial/tax records retain their statutory lifecycle;
- HestivaOS cleanup must distinguish its own stored copies from provider-platform copies that Meta may retain under its own policies.

The messaging persistence model must therefore carry enough lifecycle metadata to apply the inherited retention class and anchor safely. It must not introduce a new longer chat-retention period merely because the source is WhatsApp or Messenger.

## Consequences

### Positive

- Customers provide materially the same information regardless of Website, WhatsApp or Messenger entry channel.
- Quote validation, pricing and operational behavior stay aligned with HestivaOS rather than drifting into channel-specific copies.
- Existing privacy commitments apply consistently to messaging instead of requiring an unnecessary new retention policy.
- Future Website/Quote changes can be evaluated once and inherited by messaging where applicable.

### Trade-offs

- Messaging must track canonical Quote-contract evolution rather than freezing its own independent questionnaire.
- Conversational UX can reorder questions but still has to satisfy the full canonical fact set, which requires explicit completion-state tracking.
- Raw provider payload/media storage and provider-side deletion remain separate implementation questions because the Website does not define provider-chat transcript mechanics.

## Rejected alternatives

### Create a shorter WhatsApp-specific questionnaire

Rejected because omitting canonical Website/OS facts would produce weaker Quotes and require later manual reconstruction.

### Copy the Website form implementation literally

Rejected because presentation and transport are channel-specific. Messaging reuses canonical facts and rules, not DOM structure, Website credentials or Website provenance.

### Keep all chat history indefinitely

Rejected because it conflicts with the existing privacy lifecycle and creates unnecessary personal-information retention.

### Create a new messaging retention schedule

Rejected because the existing privacy policy already classifies enquiries and quotation/customer/service communications sufficiently for the messaging business records.

## Review triggers

Review this decision if:

- the live Homent Privacy Policy changes materially;
- the authoritative HestivaOS Quote contract supersedes v2 with materially different fact ownership;
- a provider requires retention that HestivaOS cannot reconcile with Homent's own storage obligations;
- a new messaging use case is not an enquiry, Quote, customer or service communication and genuinely falls outside the existing privacy lifecycle.
