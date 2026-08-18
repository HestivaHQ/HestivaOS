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
- Before implementing a material HestivaOS messaging change, read the latest **Current Messaging State** and later material decision/PR comments in Issue #116, then verify the relevant current repository source.
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
3. Read the current architecture/business docs and ADRs relevant to the task.
4. Read the applicable active coordination issue.
5. Verify current merged source before implementing.
6. Post material new decisions/blockers and later the PR link back to the coordination issue.

This protocol is intended to reduce repeated decisions, stale assumptions and chat-to-chat drift while keeping the repositories as the durable implementation source of truth.
