# Financial architecture

## Current approved boundary

Financial/payment state is a separate HestivaOS domain from recurrence/scheduling. `RecurringServiceAgreement` continues to own operational recurrence, lifecycle and visit generation; it must not become a payment subscription, receivables ledger or collections state machine.

The future financial domain will link to authoritative Customer, Property, RecurringServiceAgreement, WorkOrder and Quote/payment records as applicable. It will own or derive billing arrangements, active billing cycles, standing advances/security, expected receipts, outstanding balances, refunds, collection/account state, and financial correspondence state without creating a second pricing engine.

HestivaOS remains responsible for authoritative operational/pricing data used to calculate expected receipts. Month-end liability is based on actual applicable completed services and preserved prices, not an assumed number of monthly visits.

Management financial planning must represent both expected cash in and expected cash out. Upcoming Payments covers expected collections; approved refunds are visible as expected outgoing cash.

Financial/account state must be distinct from recurring-agreement lifecycle. A payment-related service hold or payment suspension can prevent a future visit from proceeding without treating that event as a new customer cancellation or rewriting recurrence history.

## Launch controls

Manual EFT is the approved launch payment method. Proof of payment indicates initiation rather than cleared funds, and required deposits become financially confirmed only after receipt is verified. Manual verification, reversals and refund approval are Admin-controlled and auditable at launch. Cash is exceptional rather than a normal staff workflow.

The financial domain must distinguish awaiting-clearance and verified payments, preserve auditable allocation and issued financial records, support genuine payment disputes, and keep payment-related service holds separate from recurring-agreement lifecycle. An outstanding balance of R50 or less remains collectible but does not by itself place the next service on payment hold.

Formal invoices require unique sequential invoice numbers. Corrections to issued financial history use auditable adjustments or credits rather than silent editing or deletion. Verified payments generate a receipt or payment confirmation tied to the applicable financial records.

Month-end billing rehabilitation is now resolved: after the approved privilege-withdrawal threshold, three consecutive successful months of standard per-job billing can make an otherwise-current customer eligible to request month-end billing again, provided there has been no further payment suspension. Reinstatement is not automatic and still requires Homent approval.

## Cross-system boundary

Website/customer correspondence must disclose material financial terms consistently with HestivaOS authoritative financial state. Any Website ↔ HestivaOS payment/billing fields must be structured and versioned through the Slice 5M Issue #73 coordination process before incompatible implementation is merged.

Customer Correspondence is now approved as a separate HestivaOS provider-neutral authority under ADR-0071. The approved first boundary is stable template identity plus immutable version lifecycle. Future Finance invoices, receipts and payment communications must consume that shared correspondence authority rather than create a competing template or outbound-history system.

## Current policy records

- `docs/decisions/ADR-0033-recurring-payment-arrangements-and-upcoming-payments.md` — original accepted domain separation and recurring-payment architecture.
- `docs/decisions/ADR-0035-recurring-financial-policy-v2.md` — superseding resolved recurring financial-policy summary.
- `docs/decisions/ADR-0036-launch-financial-controls-and-payment-policy-v3.md` — launch payment authority, verification, disputes, tolerance, rehabilitation, allocation and financial-record controls.
- `docs/decisions/ADR-0071-correspondence-template-version-ownership.md` — shared provider-neutral correspondence template/version ownership boundary.
- `docs/financial/MONTH_END_BILLING_POLICY.md` — detailed month-end eligibility, selected-date, transition, live-statement and rehabilitation rules.
- `docs/financial/COLLECTIONS_REFUNDS_AND_PRICE_CHANGES.md` — refunds, collections, account-state, launch controls and recurring-price-increase rules.
- `docs/financial/CUSTOMER_FINANCIAL_DISCLOSURE.md` — customer disclosure and preserved recurring-payment terms.

## Explicitly not yet designed

Correspondence provider/channel selection, customer-specific rendering and provenance, triggers/jobs, retries, failed-send handling, delivery tracking where supported, payment links, already-paid/disputed-payment handling, duplicate-message prevention, human approval boundaries, and communication-channel integration remain unresolved. ADR-0071 does not authorize any customer send.

Payment/collection provider selection, weekend/public-holiday collection behaviour, exact Finance persistence schema/API/UI design, and automatic collection remain unresolved. No universal three-hour retry rule is approved; future automated retries must follow the eventual provider's safe-retry semantics and first verify that the original transaction did not succeed.
