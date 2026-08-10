# ADR-0021: Generate daily Work Order references and relate canonical Services

- **Status:** Accepted
- **Date:** 2026-08-10

## Context

User-authored Work Order titles were neither stable identifiers nor controlled service data. Historical rows require compatibility, while concurrent creation requires database authority and an Africa/Johannesburg business-day boundary.

## Decision

New Work Orders require an active canonical `Service` relationship and receive a server-generated `WO-YYYYMMDD-####` reference. A daily counter row keyed by the Johannesburg creation date is atomically upserted inside a serializable transaction; its returned sequence is zero-padded and creation fails above 9999. A unique database index is the final duplicate boundary. The reference is absent from update inputs and does not change with schedule, Customer, Property, or Service edits.

`reference` and `serviceId` remain nullable so historical rows are not assigned invented chronology or relationships. The non-null historical `title` column is retained and receives the reference for new records. Presentation derives Service, Customer display name, and Property label, falling back to legacy title.

## Consequences

References contain no Customer, Property, or Service data. Deployments must apply the additive schema migration before the updated API. Recovery must restore Work Orders and daily counters consistently. Serializable conflicts may be retried by callers; neither counting Work Orders nor browser clocks allocate identifiers.
