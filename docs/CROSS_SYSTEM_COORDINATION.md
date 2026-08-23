# Cross-system coordination

This document is the durable routing map for active Homent/Hestiva cross-system coordination. It tells development chats and implementation agents **where to read current shared decisions before changing a contract that crosses repository or provider boundaries**.

It is not a replacement for repository ADRs or current-state architecture documents. Implemented architecture must still be recorded permanently in the affected repositories. Coordination issues are the live shared record while work spans multiple chats, repositories, or external platforms.

## Source-of-truth order

When sources disagree, use this order:

1. Current merged repository code, schema, configuration and tests for verified implementation state.
2. Current repository architecture/business documentation and applicable ADRs for durable implemented decisions.
3. The active coordination issue for approved cross-system product intent, open blockers and changes that have not yet been permanently encoded everywhere.
4. Chat history only as a navigation aid.

Never treat an old coordination comment or historical plan as more authoritative than newer merged implementation and documentation.

The current implementation/backlog checkpoint is `docs/CANONICAL_BACKLOG_FREEZE_2026-08-19.md`. It exists specifically to prevent historical Issue #73 / Issue #116 comments or older roadmap text from reopening work that later merged.

## Active coordination routes

### Website ↔ HestivaOS quote/enquiry/booking integration

- Coordination issue: `HestivaHQ/HestivaOS#73` — **Slice 5M — Website ↔ HestivaOS Integration Contract**.
- Scope: structured Website quote transport, quote/reference identity, Website contact-enquiry ingestion and `ENQ` reference authority, accepted-quote handoff, shared field/enumeration contracts, retry/idempotency, Website/HestivaOS integration security and related cross-repository behavior.
- New chats working on this integration must read Issue #73 plus the current Website Quote contract/ADR, `docs/WEBSITE_ENQUIRY_REFERENCE_AUTHORITY.md` when enquiry work is involved, and current merged source before changing a shared contract.
- Do not place unrelated WhatsApp/Messenger messaging work in Issue #73.

### WhatsApp + Facebook Messenger ↔ HestivaOS messaging integration

- Coordination issue: `HestivaHQ/HestivaOS#116` — **Homent Messaging Integration — WhatsApp + Messenger Coordination**.
- Scope: WhatsApp, Facebook Messenger, shared conversational/messaging architecture, provider adapters/webhooks, customer-message provenance, human escalation, and HestivaOS actions invoked from messaging channels.
- The dedicated WhatsApp/Messenger development chat must use Issue #116 as its live synchronization record.
- Before implementing a material HestivaOS messaging change, read the latest **Current Messaging State**, the 2026-08-19 canonical reconciliation checkpoint, and later material decision/PR comments in Issue #116, then verify the relevant current repository source.
- HestivaOS remains authoritative for Customers, Properties, Quotes, pricing, Work Orders, recurring services, payments and job execution. Messaging channels do not become a separate operational source of truth.

## What belongs in a coordination issue

Post material items that another chat/system must know before making compatible changes:

- newly approved shared architecture or business-contract decisions;
- provider/API selection changes that affect another system;
- shared field names, enums, payloads, identities or endpoint changes;
- authentication, webhook-verification, retry/idempotency or security-boundary changes;
- blockers or conflicts between current systems;
- PR links with a short description of the shared contract impact;
- superseded decisions and the replacement source.

Do not post secret values, provider access tokens, webhook secrets, service-role credentials or customer-sensitive data into coordination issues.

## Pull-request synchronization rule

A PR that materially changes a cross-system contract must include a **Coordination source** section in its body.

That section should point directly to:

- the applicable coordination issue (`#73` or `#116` currently);
- the relevant coordination comment/checkpoint when one exists; and
- the permanent repository document/ADR that records the implemented result.

After opening such a PR, post the PR link and a short contract-impact summary back to the applicable coordination issue. This gives other development chats one predictable place to discover the latest implementation work without searching unrelated PRs or chat history.

## New-chat protocol

For a new or resumed chat doing cross-system work:

1. Read `AGENTS.md`.
2. Read this file.
3. Read `docs/CANONICAL_BACKLOG_FREEZE_2026-08-19.md` while that checkpoint remains current.
4. Read the current architecture/business docs and ADRs relevant to the task.
5. Read the applicable active coordination issue.
6. Verify current merged source before implementing.
7. Post material new decisions/blockers and later the PR link back to the coordination issue.

This protocol is intended to reduce repeated decisions, stale assumptions and chat-to-chat drift while keeping the repositories as the durable implementation source of truth.

## 2026-08-23 Post-Event Website Quote v2 checkpoint

The approved Post-Event Cleaning service uses one canonical structured fact vocabulary across HestivaOS Quote pricing, Messaging collection/submission, and the Website Quote v2 transport. Website v2 may carry `Post-Event Cleaning` only with the exact canonical primary mapping, `ONE_TIME` frequency and structured `request.postEvent` facts defined in `WEBSITE_QUOTE_CONTRACT_V2.md` and `POST_EVENT_CLEANING_V1.md`.

This is an additive Contract v2 extension; historical Website Quote v1 behavior remains unchanged. The Website collects and transports Post-Event facts but does not calculate authoritative Post-Event pricing. HestivaOS remains the pricing/review authority and may return `NEEDS_ATTENTION` for supported customer facts that cross the automatic-pricing boundary.

Issue #73 is the coordination source for the Website implementation. Issue #116 remains the Messaging coordination source and does not need to own the Website UI work. Both channels must use the shared canonical fact vocabulary rather than defining channel-specific Post-Event semantics.

## 2026-08-19 Phase 3D Issue #116/#132 checkpoint

The implemented HestivaOS boundary follows Issue #116's provider-neutral conversations, adapter-only authenticity/normalization/transport, provider-scoped identity, provenance, and idempotency decisions, plus Issue #132's human-triggered access request and reviewed candidate-ingestion scope. `WORK_ORDER_ACCESS_RECOVERY_V1.md` and ADR-0061 are the permanent contract. No live provider adapter, autonomous contact policy, Customer identity inference, lifecycle action, or Finance behavior was added.

Phase 3D also introduced durable provider-neutral messaging persistence (`MessagingConversation`, `MessagingMessage`, message status events and related recovery provenance). Therefore older Issue #116 / roadmap wording that says durable messaging persistence is still entirely future work is superseded. The genuine messaging gap is now **live provider connectivity and customer conversation behavior**, not the base persistence layer.

## 2026-08-19 canonical reconciliation checkpoint

### Website / Issue #73

Current merged state already includes guarded structured Website Quote ingestion, authoritative Quote references/pricing, match-or-review, Admin Quote review, atomic ONE_TIME and supported recurring acceptance, and non-lossy accepted-Quote handoff. Issue #73 remains open for genuine residual cross-system work, including the documented Website enquiry / `ENQ` runtime boundary and later correspondence/financial integrations. Do not use the stale Issue #73 body status paragraph to infer that the Quote integration is still awaiting contract finalization.

### Messaging / Issue #116

Current merged state includes provider-neutral contracts, adapter boundary, provider-event idempotency, Quote-draft/human-review boundary and durable conversation/message persistence. Live WhatsApp Cloud API and Messenger webhooks/adapters, provider credentials/configuration, deterministic customer-facing conversation flows, human takeover and any later AI integration remain future work. The Website integration secret remains Website-specific and must not be reused for messaging.
