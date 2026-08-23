# Messaging Personalise Service v1

Status: IMPLEMENTED by the PR that introduces this document once merged.

## Scope

This slice extends the deterministic WhatsApp/Messenger Quote collection flow after the base Cleaning Requirements questions.

It collects only bounded, canonical Quote facts:

- generic add-ons using the existing Website Quote add-on mappings;
- required quantities for Extra Refrigerator and Balcony / Patio Cleaning;
- the explicit eco-friendly-products preference;
- structured Laundry and Ironing requests for primary services already approved by the Laundry operating model;
- laundry facilities and positive whole-number load quantities when Laundry is selected.

Laundry and Ironing remain structured `request.laundry` facts. They are not written into generic `request.addOns`.

## Safety rules

- Menu replies are interpreted only when the matching durable outbound question was previously accepted by the provider, through the existing live Messaging orchestration boundary.
- Unsupported menu values and malformed quantities are rejected rather than guessed.
- Laundry/Ironing options are offered only when the canonical Laundry operating model says the selected primary service is eligible.
- Generic add-on names and canonical service mappings are reused from the existing Website Quote contract; this slice does not create a Messaging-only pricing vocabulary.
- No AI or arbitrary free-text extraction is introduced.
- No Quote is submitted until all canonical fact groups validate and the customer later completes the existing explicit review/confirmation boundary.

## Out of scope

This slice does not collect Preferred Visit, Access/Household, Photos/Notes, or Customer Details. It does not change provider authentication, pricing formulas, Quote submission, Customer/Property creation, schema, or migrations.
