# WhatsApp Quote Flow runtime v1

## Status

**IMPLEMENTED runtime boundary; canonical Flow-field mapping and PhotoPicker retrieval remain deferred.**

This slice implements ADR-0088's durable provider/session boundary for the frozen `HOMENT_QUOTE_REQUEST_V1` contract. It does not publish the final Meta Flow JSON and does not create a canonical Quote from Flow business fields yet.

## Session ownership

`messaging_quote_flow_sessions` is an additive provider/session table separate from `MessagingConversation.quoteState`. It stores only Flow lifecycle/correlation evidence: conversation/channel/provider, frozen contract/mapping/completion IDs, exact configured provider Flow artifact ID, Flow JSON version, SHA-256 token fingerprint, lifecycle timestamps, launch/completion message identities, immutable completion fingerprint/evidence, supersession/fallback evidence and expiry.

The table does not duplicate Customer, Quote, Property or Messaging message records. Foreign keys to conversation and launch/completion messages use `RESTRICT`. Historical session evidence is not deleted when a newer session is created.

## Lifecycle

The implemented states are:

- `PREPARED` — local durable session exists but provider acceptance of the launch has not been established;
- `OFFERED` — the existing durable Messaging outbound boundary returned a provider message ID/accepted result;
- `COMPLETED` — an authenticated `nfm_reply` matched the session and immutable completion evidence was stored exactly once;
- `EXPIRED` — HestivaOS locally expired an unresolved session; this does not claim customer abandonment;
- `SUPERSEDED` — a deliberately replaced prepared session remains historical evidence;
- `FALLBACK` — a deliberate transition enabled the guided collector path and records a reason/time.

No `STARTED`, `VIEWED`, screen-progress, `ABANDONED` or `RESUMED` state is fabricated.

## Token security

A new session generates 32 cryptographically random bytes and encodes them as base64url for Meta `flow_token`. The token contains no Customer, conversation, phone, Quote or sequential database identity. HestivaOS durably stores only SHA-256 of the token. The raw token exists only long enough to construct the initial provider launch command and is not written to `MessagingMessage`, logs or the session row.

The token is correlation, not authentication. Completion is considered only after the existing WhatsApp adapter verifies Meta's raw-body `X-Hub-Signature-256` authenticity boundary.

Because the raw token is intentionally not recoverable, an already `OFFERED` compatible session is reused rather than resent. A stranded `PREPARED` session may be deliberately superseded by a fresh session/token instead of reconstructing or persisting the prior raw token.

## One unresolved session

A database partial unique index prevents parallel `PREPARED`/`OFFERED` sessions for the same conversation + Flow contract + mapping, including across a deployment Flow-artifact change. Creation is additionally serialized with a transaction advisory lock. Due sessions are locally expired before active-session checks.

Repeated offer requests reuse an already `OFFERED` compatible session for the configured artifact. If deployment changes the configured artifact while an older V1 session remains unresolved, the database refuses a parallel session; orchestration must deliberately finish, expire or transition the older session before launching the replacement.

## Launch path

The launch capability requires:

- existing Meta WhatsApp outbound configuration;
- `META_WHATSAPP_QUOTE_FLOW_ENABLED=true`;
- `META_WHATSAPP_QUOTE_FLOW_ID=<deployment-owned published Flow ID>`.

No production Flow ID is hard-coded. The runtime does not claim real-time Meta Flow health checking; `availability()` distinguishes configured/enabled from unavailable/misconfigured and explicitly reports that provider health is not checked in this slice.

Launch is:

`conversation -> prepare durable Flow session -> create durable OUTBOUND/INTERACTIVE MessagingMessage + PENDING status -> existing MessagingService.send() -> existing WhatsApp adapter -> Meta /messages`.

The reviewed provider message uses `interactive.type=flow`, `flow_message_version=3`, `flow_action=navigate`, the session raw `flow_token`, configured `flow_id`, CTA `Request a quote`, and start screen `YOUR_HOME`. The adapter accepts only this reviewed static Flow interactive shape; it does not broadly enable arbitrary WhatsApp interactive sends.

The existing outbound ambiguity boundary is preserved. Network/5xx/malformed-success outcomes remain pending reconciliation and are not blindly resent. `OFFERED` is written only after the existing send boundary returns accepted provider identity or a later authenticated provider status proves sent/delivered/read. A definite provider failure transitions the prepared session to deliberate `FALLBACK` rather than silently feeding the failed launch into guided state.

## Completion path

Authenticated WhatsApp webhook normalization remains first. The immutable inbound `MessagingMessage` is persisted using the existing provider-event replay key. Flow-first orchestration then checks `interactive.type=nfm_reply`, parses `interactive.nfm_reply.response_json`, requires a non-empty `flow_token`, and separates that token from the submitted response.

The session lookup hashes the received token and fails closed unless it binds to the same WhatsApp/Meta conversation and the frozen identifiers:

- `HOMENT_QUOTE_REQUEST_V1`;
- `HOMENT_QUOTE_REQUEST_MAPPING_V1`;
- `HOMENT_QUOTE_REQUEST_COMPLETION_V1`;
- Flow JSON `7.3`;
- the exact provider Flow artifact recorded at launch.

The completion response must also carry the frozen `homent_contract`, `homent_mapping_version` and `homent_completion_version` metadata. The provider completion does not independently echo the provider Flow ID; artifact binding therefore comes from the authenticated webhook + unique opaque session token + launch-time session record, not from trusting a client-supplied Flow ID.

Step 4 stores the structurally parsed response as immutable completion evidence but does **not** trust or map its business fields into `MessagingQuoteDraft` or create a Quote. That is Step 5.

## Completion replay

The immutable completion fingerprint is SHA-256 over a deterministic canonical JSON representation containing the token fingerprint, launch-bound provider Flow artifact/version and submitted response. The provider completion event key and completion message are unique.

An identical duplicate webhook converges on the already `COMPLETED` session. The same logical session with materially different completion data fails closed as a conflict. Expired, superseded, fallback, wrong-token, wrong-conversation, wrong-provider or wrong-version completion fails closed and creates no Quote.

## Normal chat and fallback

While a WhatsApp Flow session remains `PREPARED` or `OFFERED`, ordinary inbound text/media/other interactive messages remain normal WhatsApp conversation/help and are not passed into the deterministic guided Quote collector. General message persistence, trusted identity resolution and ordinary inbound-media securing still occur first.

Guided collection becomes answer-active only through `enterGuidedFallback(conversationId, reason)`, which records `FALLBACK`, reason and timestamp. Time passing or an ordinary customer question does not silently enter fallback.

The final customer/operator UX that invokes this deliberate transition is not expanded in this slice; the bounded durable transition is available to the orchestration layer.

## PhotoPicker boundary

No Flow PhotoPicker media retrieval, decryption, verification, Storage write or `QuotePhoto` creation is implemented here. If the frozen response contains PhotoPicker handles, they remain untrusted completion data until the dedicated media slice secures them according to ADR-0081.

PR #214 remains a separate ordinary inbound-WhatsApp-media/Quote bridge and is not modified by this Flow runtime.

## Deployment and recovery

Apply additive migration `20260824043000_whatsapp_quote_flow_sessions` before enabling Flow launch. Configure the two Flow variables only after the intended published Meta Flow artifact exists. Leaving `META_WHATSAPP_QUOTE_FLOW_ENABLED` unset/false keeps Flow launch unavailable and allows the higher orchestration layer to choose the established guided fallback.

If launch outcome is ambiguous, do not manually mint another idempotency identity or resend blindly; allow the existing Messaging status reconciliation boundary to resolve it. If completion conflicts are observed, retain the session/message evidence and investigate the provider event/session binding rather than altering stored completion evidence.

Real-time Meta `health_status` polling/caching is deliberately deferred to a provider-health slice. Production Flow JSON validation/publishing and real-device launch testing are also deferred until the final artifact exists.

## Step 5 boundary

Step 5 may consume only a valid `COMPLETED` session and must then implement:

`stored V1 response -> frozen V1 field mapping -> MessagingQuoteDraft/canonical validation -> existing Quote submission -> Quote or HUMAN_REVIEW`.

It must not reinterpret old V1 sessions using a newer mapping and must not treat PhotoPicker handles as secured Quote evidence until the dedicated Flow-media lifecycle succeeds.
