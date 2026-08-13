# Collections, refunds and recurring price changes

- Approved: 2026-08-13
- Status: product/business policy; implementation details remain separate

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
3. Before any subsequent clean, if the previous applicable balance remains unpaid, place the upcoming service on `SERVICE HOLD`; it must not proceed.
4. At +7 calendar days, if still unpaid, enter `PAYMENT SUSPENSION` and inform the customer that recurring service is suspended until the outstanding amount is settled.

A payment-related service hold is not itself a new customer cancellation and must not automatically create another cleaning/cancellation charge.

Financial/account state must preserve business meanings equivalent to:

`CURRENT`, `OVERDUE`, `REMINDER SENT`, `FINAL WARNING SENT`, `SERVICE HOLD`, `PAYMENT SUSPENDED`.

When payment is received, inappropriate reminders and restrictions must stop and the account must return to the correct current state.

## Loss of month-end billing privilege

One serious default does not automatically permanently remove month-end billing.

If the customer reaches `PAYMENT SUSPENSION` twice within a rolling 12-month period, month-end billing privilege is withdrawn after the outstanding account has been settled. The customer then returns to Homent's standard recurring rolling-advance model.

The rehabilitation period/process for becoming eligible for month-end billing again is unresolved and must not be invented.
