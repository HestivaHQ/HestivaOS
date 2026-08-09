# ADR-0015: Use one typed canonical Business Profile

- **Status:** Accepted
- **Date:** 2026-08-09

## Context

Hestiva OS needs one authoritative company-information source now and reusable data for later quotations, invoices, emails, and generated documents. It currently represents one company. Business banking and compliance details are sensitive to accidental disclosure but are not authentication secrets. Future management users may receive grouped view/share permission without edit authority.

## Decision

Store one `BusinessProfile` row whose database-constrained key is `hestiva`. Use nullable typed columns for the three groups—general, banking/payment, and compliance/official—and typed persisted booleans for each field's share preference. General customer-facing toggles default on; banking and compliance toggles default off. The record has no credential or generic secret fields.

Only ADMIN can read or update the record in this slice. The API returns business fields and share preferences, not the key or timestamps, and updates an explicit allowlist. Share formatting is pure client logic; native WhatsApp, email, and clipboard flows receive only selected non-empty values. Share toggles select content and are not authorization controls.

## Consequences

The database and API prevent competing profile rows without introducing tenants. New banking/compliance share fields can default off. Future group-based management view/share access can be added around the existing three groups without changing canonical storage; edit authority remains ADMIN-only. Persistent mutation audit storage and all downstream document integrations remain deferred.
