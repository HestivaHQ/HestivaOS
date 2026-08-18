# Work Order Interrupted Visit v1

Status: Phase 2C implementation contract.
Date: 2026-08-18
Coordination: Issue #127, Issue #73 Decisions 75–77.

HestivaOS uses a first-class `INTERRUPTED` Work Order state for an attempted visit that cannot truthfully be completed or cancelled. The field fact is recorded by the assigned Job Leader through the Technician workflow with a stable operation UUID, applicable Execution Scope revision, field timestamp, controlled reason and factual note. The original Work Order, frozen scope, section outcomes and evidence remain historical truth.

Controlled interruption reasons are: no access, utilities unavailable, safety concern, customer-requested interruption, required resource unavailable, and other.

Management follow-up is separate from the field fact. ADMIN/SUPERVISOR may append a controlled next-action route: replacement visit, follow-up, partial-completion review, financial review, or close. Routing never rewrites the interruption. A replacement route does not move the original date; Phase 2D creates the linked replacement visit. A financial-review route creates no payment, charge, credit or refund state. No customer correspondence is sent in Phase 2C.

Interrupted visits create a management-review Needs Attention item. Safety interruptions are Critical; other interruptions are High. Closing the interrupted attempt resolves that attention condition. Other routes remain attention-required until their authoritative downstream resolution exists.
