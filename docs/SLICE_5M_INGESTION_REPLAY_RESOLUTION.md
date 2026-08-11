# Slice 5M website Quote ingestion replay resolution

**Status:** runtime orchestration prerequisite; the website ingestion endpoint remains unexposed.

This sub-slice converts the approved retry/idempotency rule into a database-aware resolution primitive without creating any new Quote or operational record.

`resolveWebsiteQuoteReplay` looks up the durable Quote by its unique `submissionKey` (the website `submissionId`) and resolves one of four explicit outcomes:

- `NEW`: no Quote exists for the submission identity; later orchestration may attempt atomic creation.
- `REPLAY`: the identity exists and the current stored Quote revision contains the same canonical structured submission material; later orchestration must return the existing Quote rather than creating duplicates.
- `CONFLICT`: the identity exists but the incoming structured material differs; later orchestration must fail closed and create nothing.
- `CORRUPT_EXISTING`: the Quote's current-revision pointer cannot be reconciled with its revisions; later orchestration must fail closed and surface the data-integrity problem rather than guessing.

The comparison reuses the merged canonical SHA-256 fingerprint helper, so object-key serialization differences are ignored while material nested changes and array-order changes remain significant.

This helper does not remove the need for database-enforced uniqueness during the eventual creation transaction. Two concurrent first submissions can both initially resolve as `NEW`; the later transaction must rely on the existing unique `Quote.submissionKey` constraint, handle the losing create safely, re-read the winner, and then apply the same replay/conflict comparison.

No controller, integration secret, pricing calculation, photo transfer, Customer/Property matching, Work Order creation, Recurring Service Agreement creation, or production deployment configuration changes are introduced here.
