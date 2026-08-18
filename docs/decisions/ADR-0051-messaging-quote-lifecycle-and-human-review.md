# ADR-0051: Messaging Quote lifecycle and human-review policy

- **Status:** Accepted
- **Date:** 2026-08-18
- **Related coordination:** HestivaOS Issue #116

## Context

Messaging Foundation v1 now has an approved set of product decisions for how WhatsApp/Messenger conversations should interact with the existing HestivaOS Quote, Customer, media, and review architecture. The goal is to reuse existing Website/HestivaOS behavior rather than create a parallel messaging-only business system.

## Decision

The messaging project adopts the following rules:

1. Quote-related customer photos ultimately use the existing Quote-owned photo model. Messaging may hold only temporary provider media references while a conversation is still an enquiry; once media becomes Quote evidence it is transferred into the canonical Quote photo workflow. Messaging does not create a second permanent media library.

2. Provider/channel identity is not a canonical Customer identity. WhatsApp mobile identity may be used as a deterministic matching input where it maps safely to the existing HestivaOS Customer matching rules. Name-only or fuzzy matching is not permitted. Ambiguous/conflicting matches require review.

3. A messaging lead does not immediately create a Customer. The conversation may remain an enquiry and complete a Quote without creating an operational Customer record. New Customer creation follows the existing accepted-Quote conversion flow.

4. While the customer is still answering Quote questions, messaging stores a resumable messaging Quote draft. It does not create the canonical HestivaOS Quote until all required canonical facts are complete and the customer confirms submission.

5. Before canonical Quote creation, messaging must present a concise review summary and require explicit customer confirmation. The summary is the conversational equivalent of the Website `Review and Submit` step.

6. If a customer changes a submitted Quote, the change becomes a new immutable Quote revision of the same Quote rather than a new Quote or an overwrite of prior history.

7. Unsupported, ambiguous, manually-priced, or otherwise unsafe Quote requests enter a human-review state instead of the assistant guessing. HestivaOS must surface an operator attention/notification signal for conversations requiring this review; the exact notification UI/delivery mechanism is deferred to the OS implementation slice.

8. Human review pauses only Quote-specific automated decisions and Quote-specific automated replies. The assistant may continue answering unrelated questions and updating unrelated information. If the customer asks about the Quote while it is under review, the assistant tells them that the Quote is being reviewed and that a representative will assist shortly. Quote automation resumes only after the conversation is deliberately handed back to automation.

## Consequences

- Messaging reuses the existing HestivaOS Customer, Quote, revision, photo, pricing, and accepted-Quote conversion models.
- Abandoned conversations do not pollute the operational Customer or Quote tables.
- Customers can pause and resume Quote capture before final submission.
- Historical Quote changes and message history remain auditable.
- Human review becomes an explicit messaging state with an OS attention dependency.
- Messaging remains useful during Quote review instead of becoming completely silent.

## Deferred

This ADR does not choose:

- the exact HestivaOS notification UI or delivery channel for human-review attention;
- the final operator inbox/takeover interface;
- Meta runtime/webhook behavior;
- AI provider/model;
- exact persistence schema field names or migration shape.
