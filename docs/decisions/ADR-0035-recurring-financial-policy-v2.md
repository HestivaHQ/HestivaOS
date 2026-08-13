# ADR-0035: Recurring financial policy v2

- Status: Accepted
- Date: 2026-08-13
- Supersedes: unresolved or less-specific items in ADR-0033

## Decision

The ADR-0033 boundary remains: `RecurringServiceAgreement` owns recurrence and scheduling; financial arrangements, receivables, refunds, account state and collections remain a separate financial domain.

Standard recurring service keeps a standing advance equal to 50% of one normal visit. Month-end billing remains optional and requires two successfully paid months, a current account, satisfactory history, no unresolved balance or repeated failed-payment behaviour, customer request and Homent approval.

Approved month-end customers choose day 25, 26, 27, 28, 29, 30, 31, 1, 2, 3, 4, 5, 6 or 7. If selected day 29, 30 or 31 does not exist in a month, that month's due date is the final calendar day; the stored preference does not change. Weekend/public-holiday handling remains unresolved.

Switching to month-end billing requires no extra transition payment. The existing 50% one-visit advance remains standing security. The first scheduled service after the next selected billing-date anchor begins the month-end cycle. The live bill accumulates actual completed services, so four- and five-visit months differ naturally.

HestivaOS financial planning must show expected cash in and expected cash out. Upcoming Payments must support customer, property, agreement, billing method/date, next due date, completed services in the cycle, expected and outstanding amounts, standing security, next clean, account/hold state and reminder state. Approved refunds must be visible and initiated within five business days; provider reflection time may be longer.

Recurring price increases require at least 30 calendar days' written notice, no retrospective repricing, and explicit old/new price, effective date, current/new standing advance and resulting adjustment. Any advance increase is incorporated into the first applicable payment at the new price.

No late-payment fee or interest is approved. Unpaid accounts follow these business meanings: +24h friendly reminder; +72h final warning; before a subsequent clean, SERVICE HOLD; +7 calendar days, PAYMENT SUSPENSION. A payment-related hold is not a new cancellation and creates no new cancellation charge. Two PAYMENT SUSPENSION events within a rolling 12 months remove month-end privilege after settlement; rehabilitation rules remain unresolved.

Material financial terms must be communicated with actual ZAR amounts when known. Automated financial correspondence is required, but its technical architecture must be discussed and approved separately before implementation. No email, payment or collection provider is selected by this ADR.

These rules affect both the website and HestivaOS. Any shared financial fields must be structured, versioned and coordinated through Issue #73 before incompatible implementation is merged.

## Consequences

ADR-0033 remains historical and authoritative for the domain-separation principle; ADR-0035 supplies the now-resolved policy. Exact persistence schema, API/UI design, correspondence architecture, payment provider, weekend/public-holiday collection behaviour and month-end rehabilitation remain unapproved.
