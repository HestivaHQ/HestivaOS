# ADR-0064: Broker private Execution Evidence reads through short-lived access

- Status: Accepted
- Date: 2026-08-19

## Decision

Keep Execution Evidence objects private and storage paths out of broad domain projections. The API verifies the evidence-to-Work-Order binding plus existing ADMIN/SUPERVISOR authority, or current active Technician assignment, before issuing a 60-second signed Supabase Storage URL. Signing uses an API-only service-role credential and returns no raw object path.

The capture/upload/acknowledgement model and evidence provenance remain unchanged. Reads never mutate or supersede evidence. Post-completion correction authority is not established by this decision.

## Consequences

Guessing a path is not authorization, broad reads no longer leak storage implementation detail, and intended reviewers can retrieve a specific acknowledged artifact briefly. Deployment must keep the bucket private and protect the service-role credential. Finance, correspondence, messaging providers and Work Order lifecycle remain unchanged.
