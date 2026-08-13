# Month-end billing policy

- Approved: 2026-08-13
- Status: product/business policy; implementation details remain separate

## Eligibility

Month-end billing is not available immediately to a new recurring customer. A customer may request it only after two successfully paid months of standard recurring service. The account must be fully current, have satisfactory payment history, have no unresolved outstanding balance, and have no repeated failed-payment behaviour.

Eligibility does not activate month-end billing automatically. The customer must request it and Homent must approve it.

## Selected billing day

An approved customer chooses exactly one preferred billing day from this ordered window across the month boundary:

`25, 26, 27, 28, 29, 30, 31, 1, 2, 3, 4, 5, 6, 7`

The selected day is persistent structured data.

If the selected day is 29, 30, or 31 and that date does not exist in a particular month, payment is due on the final calendar day of that month. The selected preference itself does not change. The normal selected day resumes automatically when it exists again.

Weekend and public-holiday collection behaviour is unresolved and must not be invented until the eventual payment/collection provider is known.

## Transition from standard recurring billing

The additional transition payment is R0. Homent must not demand another large deposit. The existing 50% one-normal-visit advance remains held as standing account security while month-end billing is active.

Month-end billing begins with the first scheduled service after the customer's next selected billing-date anchor. Approval does not create an immediate partial cycle.

Example: approval on 14 August with selected day 25 makes 25 August the next anchor. The first scheduled clean after 25 August starts the new month-end cycle. Completed services then accumulate toward the next 25th.

## Live accumulating statement

Every approved month-end customer requires a live accumulating billing statement for the active cycle. Each applicable completed service is added to the running bill at its applicable preserved price.

The system must not assume four visits per month. Four-clean and five-clean months naturally produce different totals based on actual applicable completed services.

The customer-facing account/correspondence experience must make the running liability clear, including selected billing date, completed services in the active cycle, running amount, expected amount due, standing security/advance, and next payment date.

## Loss and rehabilitation

If the customer reaches `PAYMENT SUSPENSION` twice within a rolling 12-month period, month-end billing privilege is withdrawn after the outstanding account has been settled and the customer returns to standard recurring per-job billing.

After withdrawal, the customer may become eligible to request month-end billing again after three consecutive successful months of standard per-job billing, provided the account is current and there has been no further payment suspension during that rehabilitation period.

Rehabilitation eligibility does not automatically restore month-end billing. The customer must request it and Homent must approve the return to month-end billing.

## HestivaOS financial planning

Upcoming Payments must be capable of representing customer, property, recurring agreement, billing method, selected billing date, next due date, completed services in the current billing cycle, expected amount, standing advance/security held, outstanding amount, next scheduled clean, payment/account status, whether future service is on hold, and reminder status.

Required management summaries include Due today, Next 7 days, Rest of month, Expected month-end collections, and Overdue.

This financial planning capability must remain separate from `RecurringServiceAgreement` recurrence generation. Recurrence/scheduling and financial/payment state are related but separately owned domains.
