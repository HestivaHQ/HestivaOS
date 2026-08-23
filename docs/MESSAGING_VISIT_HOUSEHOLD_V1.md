# Messaging Visit & Household Details v1

## Status

Implemented by the bundled Messaging Quote slice following PR #206.

This slice extends deterministic WhatsApp/Messenger Quote collection from `PERSONALISE_SERVICE` into the canonical `PREFERRED_VISIT` and `ACCESS_AND_HOUSEHOLD` fact groups. It does not add AI or free-text inference.

## Preferred Visit

The guided flow collects:

- preferred date as an explicit real calendar date in `YYYY-MM-DD` form;
- optional alternative date, with `0` meaning no alternative date;
- preferred time from the canonical `MORNING`, `MIDDAY`, `AFTERNOON`, or `FLEXIBLE` values;
- flexibility as trimmed verbatim customer text;
- urgency as trimmed verbatim customer text;
- optional recurring-schedule notes, with `0` meaning none.

Dates are syntax- and calendar-validated. Natural-language dates such as `next Tuesday` are not interpreted in this deterministic slice.

## Access & Household

The guided flow collects:

- canonical complex/property access mode;
- optional security/gate instructions;
- optional parking instructions;
- canonical key-handover mode;
- required verbatim handover details when `TO_BE_ARRANGED` is selected;
- whether someone will be present;
- whether pets are present;
- pet type and temperament when pets are present.

Bounded choices accept only the listed numeric response. Optional text uses explicit `0` for none. Required descriptive answers are stored verbatim after trimming and are not semantically interpreted.

## Safety and ordering

The existing durable prompt-evidence rule remains authoritative: a reply is interpreted only after the exact current prompt has an `ACCEPTED` delivery-status event. Invalid or ambiguous replies do not mutate Quote state and receive the existing deterministic retry prompt.

The collection order remains:

`YOUR_HOME` → `CLEANING_REQUIREMENTS` → Post-Event facts when applicable → `PERSONALISE_SERVICE` → `PREFERRED_VISIT` → `ACCESS_AND_HOUSEHOLD`.

Post-Event-specific collection remains before generic personalisation and visit/household collection.

## Non-goals

This slice does not implement:

- `PHOTOS_AND_NOTES`;
- `YOUR_DETAILS`;
- AI/free-text extraction of multiple Quote facts;
- availability promises or booking confirmation;
- changes to pricing, Quote submission authority, provider authentication, or Customer identity rules.
