# HestivaOS performance audit

## 2026-08-13 — UI/UX speed pass 1

This audit records verified performance work undertaken because routine HestivaOS administration and manual testing had become slow enough to materially increase development time. The first implementation pass is deliberately narrow: reduce redundant authentication work and unnecessary repeated list loading without changing authorization, domain behavior, or workflow ownership.

### Implemented in PR #85

- Customers no longer performs an unused session fetch and then causes `AppFrame` to synchronize the same application user again. The page resolves the application user once and supplies it to the shared shell.
- Work Orders applies the same single-user-sync pattern.
- Work Order reference data (customers, properties, technicians, crews, primary services, and add-ons) is loaded separately from the work-order queue. Searching the queue no longer reloads all six reference datasets.
- Work Order search is debounced by 300 ms and refreshes only the work-order list.
- Customer search is debounced by 300 ms instead of issuing a request on every keystroke.

### Verified remaining hot paths

The first pass does not claim to solve all latency. Repository inspection identified additional performance work that requires separate review because it touches shared authentication or dashboard architecture:

- The web middleware verifies the Supabase user for protected navigation, while many server-rendered pages also call Supabase user verification again.
- `AppFrame` synchronizes the HestivaOS application user when a page does not supply one, which can add another API request during navigation.
- The API authentication guard currently validates every authenticated bearer token by requesting Supabase Auth `/auth/v1/user`, then performs a HestivaOS `User` lookup before endpoint-specific work. This is a system-wide network hot path and must not be removed without an equally secure token-verification replacement.
- The dashboard overview currently executes a broad set of database reads and aggregates, including data not required by the present daily command-centre UI. A later performance change should reduce that over-fetching rather than weakening correctness.
- The login client currently performs navigation and then an explicit router refresh; this is under review as a redundant post-login render.

### Guardrails

Performance changes must preserve application access enforcement, role checks, Supabase identity ownership, auditability, and fail-closed behavior. Security checks will not be bypassed merely to improve perceived speed. Larger authentication changes require verified local JWT-signature validation or another equivalent trust-preserving design before the current remote verification path can be replaced.
