# Collections, refunds and recurring price changes

- Approved: 2026-08-13
- Status: product/business policy; implementation details remain separate

## Launch authority and payment verification

Manual EFT is the launch payment method. Proof of payment is evidence that payment was initiated; it is not proof that funds cleared. A legitimate proof of payment may remain awaiting clearance for up to two business days. A required booking deposit is financially confirmed only after receipt of funds is verified.

Manual payment verification is ADMIN-only at launch. Supervisors may view payment status where authorized but cannot mark an EFT paid. Verification and reversal must be auditable. Refund approval is also ADMIN-only; supervisors may submit refund requests but cannot approve refunds or mark them refunded.

Cash is not a normal launch payment method. Cleaners and supervisors must not routinely accept cash. Exceptional cash acceptance requires explicit Admin authorization plus reconciliation and audit controls.

## Upcoming refunds / expected cash out

HestivaOS financial planning must show expected outgoing cash as well as expected incoming cash.

Approved Homent refunds must be initiated within five business days. The customer's bank/payment provider may take additional time to reflect the funds after initiation.

Operational refund state must preserve meanings equivalent to:

`PENDING → PROCESSING → REFUNDED`

Applicable refunds may include refundable deposits, unused standing advances, overpayments, duplicate payments, Homent-cancelled services, and refunds resulting from reduced or waived cancellation charges.

## Recurring price increases

Recurring customers must receive at least 30 calendar days' written notice before a price increase takes effect.

The notice must explicitly show the current price, new price, effective date, current standing advance, new 50% standing advance, any resulting advance adjustment, and revised estimated month-end amount where applicable.

There is no retrospective repricing. Services performed before the effective date retain the old price. Services performed on or after the effective date use the new price.

Any increase to the customer's 50% standing advance is incorporated into the first applicable payment at the new price rather than demanded immediately when the notice is issued.

Because recurring service has no fixed-term lock-in, the customer may end the recurring arrangement before the increase takes effect under the applicable termination rules.

## Overdue-payment workflow

No late-payment fee or interest is currently approved.

When payment remains unpaid:

1. At +24 hours, send an automatic friendly payment reminder. It should include, where applicable, the amount outstanding, service/billing period, original due date, payment instructions or payment link, and the relevant consequence of continued non-payment.
2. At +72 hours, send an automatic final payment warning explaining that the account is overdue and upcoming cleaning will not proceed while the previous balance remains outstanding.
3. Before any subsequent clean, if the previous applicable balance remains unpaid above the approved tolerance, place the upcoming service on `SERVICE HOLD`; it must not proceed.
4. At +7 calendar days, if still unpaid, enter `PAYMENT SUSPENSION` and inform the customer that recurring service is suspended until the outstanding amount is settled.

An outstanding balance of R50 or less does not by itself place the next service on payment hold. The amount remains debt and is not forgiven. Above R50, the normal service-hold rule applies.

A payment-related service hold is not itself a new customer cancellation and must not automatically create another cleaning/cancellation charge.

Financial/account state must preserve business meanings equivalent to:

`CURRENT`, `OVERDUE`, `REMINDER SENT`, `FINAL WARNING SENT`, `SERVICE HOLD`, `PAYMENT SUSPENDED`.

When payment is received, inappropriate reminders and restrictions must stop and the account must return to the correct current state.

## Payment disputes

For a genuine payment dispute, only the identified disputed amount is paused. Undisputed amounts remain payable. A genuine dispute alone must not suspend otherwise-current recurring service.

The customer must receive an automatic acknowledgement. The target for initial human review is two business days and the target for resolution is five business days.

## Payment allocation and issued financial records

If a payment covers multiple invoices, explicit customer allocation instructions take precedence. Without explicit instructions, allocation is oldest outstanding amount first. Allocation must be auditable.

Formal invoices require unique sequential invoice numbers. Issued financial history must not be silently edited or deleted; corrections use auditable adjustments or credits. Verified payments must generate a receipt/payment confirmation tied to the applicable invoice or invoices, amount, payment date and payment method.

## Loss of month-end billing privilege

One serious default does not automatically permanently remove month-end billing.

If the customer reaches `PAYMENT SUSPENSION` twice within a rolling 12-month period, month-end billing privilege is withdrawn after the outstanding account has been settled. The customer then returns to Homent's standard recurring rolling-advance model.

After three consecutive successful months of standard per-job billing, a customer may become eligible to request month-end billing again if the account is current and there has been no further payment suspension. Reinstatement is not automatic and still requires Homent approval.

## Future automated payment retries

No universal three-hour retry rule is approved. Any future automated retry must depend on the eventual payment provider indicating that the failure is safely retryable, and the system must first verify that the original transaction did not succeed.
