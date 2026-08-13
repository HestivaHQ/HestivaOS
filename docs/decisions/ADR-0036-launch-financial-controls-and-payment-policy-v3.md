# ADR-0036: Launch financial controls and payment policy v3

- Status: Accepted
- Date: 2026-08-14
- Supersedes: unresolved or less-specific financial-policy items in ADR-0035

## Context

ADR-0033 separated recurring operational scheduling from financial arrangements. ADR-0035 resolved the recurring rolling-advance model, month-end billing mechanics, overdue states, refunds and recurring price-increase notice, while deliberately leaving month-end rehabilitation and payment-provider/runtime details unresolved.

Website policy work coordinated through Slice 5M Issue #73 has now approved additional launch financial controls that HestivaOS must preserve before runtime financial implementation is designed.

## Decision

Manual EFT is the launch payment method. Proof of payment is evidence that a customer initiated a payment; it is not proof that funds cleared. A legitimate proof of payment may place a payment into an awaiting-clearance state for up to two business days. A required booking deposit is financially confirmed only after receipt of funds is verified.

Manual payment verification is ADMIN-only at launch. Supervisors may view payment status where authorized but cannot mark EFT payments as paid. Any future delegation requires an explicit permission decision. Verification and reversal must be auditable.

Financial authority defaults to ADMIN-only at launch unless an approved policy explicitly delegates a narrower action. Refund approval is ADMIN-only. Supervisors may submit refund requests but cannot approve refunds or mark them refunded.

An outstanding balance of R50 or less does not by itself place the next service on payment hold. The amount remains debt and is not forgiven. Above R50, the normal approved service-hold policy applies.

For a genuine payment dispute, only the identified disputed amount is paused. Undisputed amounts remain payable. The system/policy must support automatic acknowledgement, an initial human-review target of two business days, and a target resolution of five business days. A genuine dispute alone must not suspend otherwise-current recurring service.

A customer who lost month-end billing privilege after two PAYMENT SUSPENSION events in a rolling 12-month period may become eligible to request month-end billing again after three consecutive successful months on standard per-job billing, provided the account is current and there has been no further payment suspension. Eligibility permits a request; reactivation still requires Homent approval and is not automatic.

When one payment is applied across multiple invoices, explicit customer allocation instructions take precedence. Without explicit instructions, allocation is oldest outstanding amount first. Allocation must be auditable.

Formal invoices require unique sequential invoice numbers. Issued financial history must not be silently edited or deleted; corrections use auditable adjustments or credits. Verified payments must generate a receipt or payment confirmation tied to the applicable invoice or invoices, amount, payment date and payment method.

Cash is not a normal launch payment method. Cleaners and supervisors must not routinely accept cash. Exceptional cash acceptance requires explicit Admin authorization plus reconciliation and audit controls.

No universal three-hour payment retry rule is approved. Any future automated retry depends on the eventual payment provider explicitly indicating that a failure is safely retryable, and the system must first verify that the original transaction did not succeed.

These rules affect both the website/customer policy surface and HestivaOS. Shared financial fields and state meanings must remain structured/versioned and coordinated through Slice 5M Issue #73 before incompatible implementation is merged.

## Consequences

- Launch payment operations remain deliberately manual and Admin-controlled while preserving a future provider boundary.
- Proof of payment and cleared/verified payment are distinct financial states.
- Small balances remain collectible without automatically disrupting service.
- Disputes pause only the disputed amount rather than freezing the whole account by default.
- Month-end privilege now has an approved rehabilitation path after withdrawal.
- Payment allocation, verification, reversals, invoices, credits and receipts require auditable history.
- Cash handling is exceptional rather than a normal cleaner/supervisor workflow.
- Future payment automation cannot invent retry timing independently of provider semantics.

## Explicitly unresolved

This ADR does not select a payment gateway or collection provider, approve automatic collections, define the exact persistence schema/API/UI, approve automated-correspondence architecture, define weekend/public-holiday collection behaviour, or delegate launch financial authority beyond the roles stated above.
