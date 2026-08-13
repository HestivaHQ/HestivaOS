# ADR-0033: Model recurring payment arrangements separately and expose upcoming payments

- Status: Accepted
- Date: 2026-08-13

## Context

Homent has approved customer-facing payment rules that must remain coordinated between the public website/booking correspondence and HestivaOS operations.

RecurringServiceAgreement already represents the Property-owned operational recurrence commitment. ADR-0026 deliberately states that recurring agreements are not payment subscriptions. That ownership boundary remains correct and must not be weakened by embedding financial state directly into recurrence-generation semantics.

Homent also needs management visibility into expected incoming cash so owners/admins can plan wages, fuel, supplies and other operating costs without reconstructing receivables manually from Work Orders.

## Decision

Payment arrangements are a separate financial concern linked to the authoritative Customer/Property/RecurringServiceAgreement/WorkOrder records as applicable. Recurrence generation remains operational scheduling; it does not become a billing subscription engine.

Initial/once-off bookings require 50% to secure the booking and the remaining 50% upon completion.

After the first visit, standard recurring service uses a standing advance equal to 50% of one normal recurring visit, not 50% of an entire upcoming month. After each completed recurring visit, the payment due settles the unpaid portion of that visit and replenishes the 50% advance for the next scheduled visit. If required payment is not received, future services may be held rather than allowing arrears to accumulate.

Recurring service has no fixed-term lock-in. A customer may end or pause recurring service with at least 14 days' notice. Individual visit cancellation/rescheduling remains governed by the 24-hour visit rule. Pause/resume/cancel semantics already approved for recurring agreements remain unchanged; lifecycle changes do not silently rewrite already-created Work Orders.

Month-end billing is an approved alternative only for established recurring customers. Eligibility requires two successful months under standard recurring billing, the account must be current and in good standing, and Homent must approve the change. The existing standing 50% one-visit advance remains in place as security.

Month-end billing covers actual completed visits in the applicable billing cycle. Four- and five-visit months therefore produce different totals.

The customer chooses one agreed billing day from the approved salary-cycle window: day 25 through day 7 of the following month. Supported day numbers are 25, 26, 27, 28, 29, 30, 31 when valid for that calendar month, then 1, 2, 3, 4, 5, 6 and 7. The selected billing day must be structured data. No additional grace period is approved. Behaviour for a selected date that does not exist in a shorter month remains unresolved and must not be invented silently.

If the agreed month-end payment is not received, future visits may be held. Repeated failures may remove month-end-billing eligibility and return the customer to standard recurring billing or trigger suspension/termination as otherwise allowed.

Material payment terms must be generated explicitly for the customer rather than relying on owners, supervisors or cleaners to explain them manually. Where amounts are known, customer correspondence must present actual ZAR amounts, including total price, pay-now amount, remaining balance, standing advance, payment cadence/date, cancellation consequences and the expected monthly commitment for approved month-end billing.

HestivaOS requires a dedicated management-facing Upcoming Payments capability. It must derive expected receipts from authoritative operational and payment-arrangement data rather than creating a second pricing engine.

At minimum it must expose, subject to role authorization: Customer, Property, linked RecurringServiceAgreement and/or WorkOrder, expected due date, billing arrangement, expected amount, standing advance held, outstanding amount, next scheduled service, payment status, and whether future service is active, at risk, or held for payment reasons.

Management summaries must support at least: due today, due in the next 7 days, due during the remainder of the current month, expected month-end collections, and overdue amounts. These summaries are for cash-flow planning and must respect existing ADMIN-only pricing/financial access boundaries.

Slice 5M Issue #73 remains the coordination point for Website ↔ HestivaOS contract changes. Payment-arrangement fields added to the shared contract must be versioned/structured and coordinated there before incompatible implementation is merged in either repository.

## Consequences

- Recurrence and billing remain separately owned domains.
- Homent can offer flexible recurring payment arrangements without making supervisors responsible for explaining policy verbally.
- Month-end billing is controlled by payment history rather than available to new customers immediately.
- Management gains forward-looking expected-cash visibility without deriving it manually from bookings.
- Four/five-week months remain factual because billing follows actual visits.
- Missing/invalid financial state must fail closed rather than silently producing misleading expected-payment data.

## Explicitly unresolved

This ADR does not approve a payment processor or automatic collection provider, a grace period after the selected billing date, fallback semantics when selected day 29/30/31 does not exist in a given month, the exact transition amount beyond the existing one-visit advance when activating month-end billing, refund processing timeframes, recurring-service price-increase notice rules, or detailed database/API/UI implementation fields beyond the required capabilities and boundaries above.
