# Financial architecture

## Current approved boundary

Financial/payment state is a separate HestivaOS domain from recurrence/scheduling. `RecurringServiceAgreement` continues to own operational recurrence, lifecycle and visit generation; it must not become a payment subscription, receivables ledger or collections state machine.

The future financial domain will link to authoritative Customer, Property, RecurringServiceAgreement, WorkOrder and Quote/payment records as applicable. It will own or derive billing arrangements, active billing cycles, standing advances/security, expected receipts, outstanding balances, refunds, collection/account state, and financial correspondence state without creating a second pricing engine.

HestivaOS remains responsible for authoritative operational/pricing data used to calculate expected receipts. Month-end liability is based on actual applicable completed services and preserved prices, not an assumed number of monthly visits.

Management financial planning must represent both expected cash in and expected cash out. Upcoming Payments covers expected collections; approved refunds are visible as expected outgoing cash.

Financial/account state must be distinct from recurring-agreement lifecycle. A payment-related service hold or payment suspension can prevent a future visit from proceeding without treating that event as a new customer cancellation or rewriting recurrence history.

## Cross-system boundary

Website/customer correspondence must disclose material financial terms consistently with HestivaOS authoritative financial state. Any Website ↔ HestivaOS payment/billing fields must be structured and versioned through the Slice 5M Issue #73 coordination process before incompatible implementation is merged.

## Current policy records

- `docs/decisions/ADR-0033-recurring-payment-arrangements-and-upcoming-payments.md` — original accepted domain separation and recurring-payment architecture.
- `docs/decisions/ADR-0035-recurring-financial-policy-v2.md` — superseding resolved policy summary.
- `docs/financial/MONTH_END_BILLING_POLICY.md` — detailed month-end eligibility, selected-date, transition and live-statement rules.
- `docs/financial/COLLECTIONS_REFUNDS_AND_PRICE_CHANGES.md` — refunds, collections, account-state and recurring-price-increase rules.
- `docs/financial/CUSTOMER_FINANCIAL_DISCLOSURE.md` — customer disclosure and preserved recurring-payment terms.

## Explicitly not yet designed

The technical automated-correspondence system is not approved. Before implementation, a separate decision is required for provider/architecture, templates/tone, triggers/jobs, retries, failed-send handling, delivery tracking where supported, payment links, already-paid/disputed-payment handling, duplicate-message prevention, audit/history storage, and any communication channels beyond email.

Payment/collection provider selection, weekend/public-holiday collection behaviour, exact persistence schema/API/UI design, and month-end rehabilitation rules after privilege withdrawal also remain unresolved.
