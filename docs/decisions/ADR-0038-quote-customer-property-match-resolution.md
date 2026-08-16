# ADR-0038: Quote Customer and Property match-or-review

- Status: Accepted
- Date: 2026-08-15

## Context

Future accepted-Quote conversion must resolve the submitted person and service address without merging or overwriting operational records during review. Contact and address data can be duplicated or disagree, and visit instructions are not Property identity.

## Decision

Quote review computes deterministic, non-mutating suggestions. A unique canonical email/mobile match may identify an existing Customer; disagreement or multiple matches requires review, and name alone never identifies one. Property matching is restricted to the resolved Customer and requires a normalized exact address; duplicates require review.

An ADMIN may durably choose `USE_EXISTING` or `CREATE_NEW` for both entities. The Quote stores decisions, selected IDs, and source revision number; an append-only Quote activity stores actor and decision context. A serializable compare-and-set accepts identical retries and rejects stale, concurrent, or conflicting decisions. Review creates no Customer, Property, Work Order, or recurring agreement.

## Consequences

Future acceptance can consume stored intent inside its wider atomic transaction. Automatic merging, fuzzy name/address identity, resolution replacement, operational conversion, and duplicate-customer merge/reversal remain out of scope.
