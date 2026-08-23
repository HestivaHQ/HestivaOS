# Messaging Final Details v1

## Status

Implemented by the `feat/messaging-final-details` slice after guided Visit & Household collection merged through PR #209.

Coordination source: `HestivaHQ/HestivaOS#116`.

## Scope

This slice extends the deterministic Messaging Quote collection chain with the remaining `PHOTOS_AND_NOTES` and `YOUR_DETAILS` sections.

The existing collection order remains provider-neutral and continues through Home/Property, Cleaning Requirements, Post-Event facts when applicable, Personalise Service, Preferred Visit, Access & Household, and then these final details before the already-implemented review/confirmation boundary.

## Safety and notes collection

The flow asks explicitly for the canonical optional safety and note fields rather than inferring that missing information means "none".

Safety fields are:

- off-limits areas;
- fragile items;
- product restrictions;
- allergies or sensitivities;
- existing damage.

Note fields are:

- attention areas;
- renovation/construction dust;
- appliance notes;
- additional notes.

For each optional text field, exact `0` records an explicit empty value. Any supplied text is trimmed and stored verbatim; it is not semantically interpreted or reclassified by AI.

## Photos

Quote photos remain optional.

The guided flow may record `photos: []` only after the customer explicitly replies `0` to continue without Quote photos. It does not infer that no photo message means no photos.

Automated provider-media-to-Quote-photo attachment is intentionally not implemented by this slice. ADR-0081 keeps provider media in a separate secure asset lifecycle outside immutable message history, and its review triggers explicitly require a reviewed design before introducing media-read/attachment behavior. WhatsApp secure media storage also does not imply equivalent Messenger media storage.

Therefore this slice does not invent file names, hashes, byte sizes, base64 transfer data or Quote photo identities from provider attachments. A future cross-provider secure media-to-Quote bridge must be implemented separately.

## Customer details

The flow collects the canonical Quote customer facts explicitly:

- full name;
- email;
- mobile number in E.164 format;
- preferred contact method (`PHONE`, `EMAIL`, or `WHATSAPP`) through a bounded menu.

The provider sender identity is not silently copied into `customer.mobile`. This preserves the approved model where a person may contact Homent from a different number, use multiple WhatsApp accounts, or contact Homent on behalf of another customer.

Email and mobile values fail closed on invalid deterministic format. Preferred contact accepts only the listed bounded option.

## Prompt integrity

These questions reuse the existing guided Messaging collection runtime. A reply is interpreted only after the exact current prompt has a durable provider `ACCEPTED` delivery event. Invalid replies do not mutate Quote state and receive the existing idempotent retry prompt.

Nested state updates continue to use optimistic concurrency and recursive merge semantics. Final collection completion does not create a Quote by itself; it allows the existing canonical validator to move the conversation to `REVIEW` only when all required business fact groups are valid.

## Non-goals

This slice does not:

- add AI or natural-language multi-field extraction;
- infer customer identity from provider identity;
- attach provider media to canonical Quote photos;
- change Meta authentication, provider adapters or message immutability;
- change pricing, Quote authority or submission identity;
- create Customers or Properties early;
- replace the existing explicit review and exact `CONFIRM` submission boundary.
