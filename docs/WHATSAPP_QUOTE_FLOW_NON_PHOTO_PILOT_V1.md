# WhatsApp Quote Flow V1 non-photo pilot preparation

## Status

**REPOSITORY PREPARATION COMPLETE WHEN THIS PR IS GREEN. REAL META DEPLOYMENT NOT YET PERFORMED. REAL-DEVICE PILOT NOT YET PERFORMED.**

This document prepares the controlled Step 6A deployment of the frozen `HOMENT_QUOTE_REQUEST_V1` contract without Flow PhotoPicker. It does not claim that Meta has accepted, validated, previewed or published the artifact and it does not claim any Android/iOS test result.

Governing contracts and decisions remain `MESSAGING_WHATSAPP_QUOTE_FLOW_V1.md`, `WHATSAPP_QUOTE_FLOW_RUNTIME_V1.md`, `WHATSAPP_QUOTE_FLOW_MAPPING_SUBMISSION_V1.md`, ADR-0049, ADR-0081 and ADR-0088. Coordination remains Issue #116.

## Artifact generation

Repository-owned generator:

`python3 scripts/generate_whatsapp_quote_flow_v1_non_photo.py --output /tmp/HOMENT_QUOTE_REQUEST_V1.flow.json --check`

The generator consumes `docs/contracts/HOMENT_QUOTE_REQUEST_V1.json` and produces the Meta upload artifact rather than maintaining a second hand-edited field contract. Local validation fails if the frozen contract/mapping/completion identifiers change, screen order changes, a non-photo machine field disappears, PhotoPicker leaks into the pilot artifact, or a screen exceeds the reviewed 50-component ceiling.

The pilot artifact preserves these eight screens in order:

1. `YOUR_HOME`
2. `CLEANING_REQUIREMENTS`
3. `PERSONALISE_SERVICE`
4. `PREFERRED_VISIT`
5. `ACCESS_HOUSEHOLD`
6. `PHOTOS_NOTES`
7. `YOUR_DETAILS`
8. `REVIEW_SUBMIT`

`PHOTOS_NOTES` retains the notes fields but deliberately omits the `quote_photos`/PhotoPicker component. The frozen canonical contract still retains `quote_photos`; this is a pilot presentation gate only and is not a deletion or reinterpretation of future photo policy.

The final Footer action is `complete` and carries the frozen metadata:

- `homent_contract = HOMENT_QUOTE_REQUEST_V1`
- `homent_mapping_version = HOMENT_QUOTE_REQUEST_MAPPING_V1`
- `homent_completion_version = HOMENT_QUOTE_REQUEST_COMPLETION_V1`

No pricing, availability or booking decision is performed in the Flow.

## Conditional presentation

The artifact uses static Flow presentation only. Required/visible expressions are generated from the frozen V1 conditional contract. Add-on quantity visibility uses client-side `update_data` flags on the two relevant Checkbox options so `EXTRA_REFRIGERATOR` and `BALCONY_PATIO` reveal their quantity fields without a backend `data_exchange` endpoint.

All conditions are UX only. Step 5 continues to revalidate completion data in HestivaOS and must reject malformed, unsupported or contradictory data regardless of what the client displayed.

## Validation state

Two validation levels must remain distinct:

- **LOCAL VALIDATION PASSED** means the repository generator and tests agree with the frozen contract, machine field IDs, versions, screen order, completion metadata and non-photo pilot boundary.
- **META VALIDATION NOT YET PERFORMED** remains true until the generated JSON is uploaded to an actual Meta WhatsApp Flow draft and Meta reports no validation errors.

Meta remains the final schema validator. If Meta rejects the generated artifact, preserve the exact validation error and do not silently change canonical field meaning or frozen identifiers to make the upload pass.

## Provider artifact creation

Create the provider artifact in WhatsApp Manager as a **static / Without endpoint** Flow. Recommended provider-facing name:

`Homent Quote Request V1`

Recommended category: `OTHER`.

Do not publish until Meta validation and preview are clean enough for the controlled pilot. Publishing is treated as irreversible for that provider Flow artifact; later material changes use a new/clone Flow rather than mutating the live V1 artifact in place.

The resulting provider Flow ID is deployment-owned configuration and must never be hard-coded into source.

## HestivaOS runtime configuration

After the intended Meta Flow has been published, configure these API runtime variables in the Railway service that runs HestivaOS API:

- `META_WHATSAPP_QUOTE_FLOW_ID` — the published Meta Flow ID. This is an identifier, not an access token, but it remains deployment-owned and is not committed.
- `META_WHATSAPP_QUOTE_FLOW_ENABLED` — set to `true` only when the reviewed provider artifact should be offered as the primary WhatsApp Quote path.

The existing Meta provider runtime still requires its already-documented API-only variables such as `META_WHATSAPP_ACCESS_TOKEN`, `META_WHATSAPP_PHONE_NUMBER_ID`, `META_GRAPH_API_VERSION`, `META_APP_SECRET` and `META_WHATSAPP_WEBHOOK_VERIFY_TOKEN`. Do not paste their values into GitHub, Issue #116, logs, screenshots or chat.

Safe activation order:

1. Generate the JSON and pass repository checks.
2. Create the Meta Flow draft as `Homent Quote Request V1`, static/Without endpoint.
3. Upload/paste the generated JSON.
4. Resolve Meta validation errors without changing canonical semantics silently.
5. Preview and exercise all eight screens in Meta tooling.
6. Publish the exact reviewed draft.
7. Copy the resulting Meta Flow ID.
8. Set `META_WHATSAPP_QUOTE_FLOW_ID` in Railway.
9. Keep `META_WHATSAPP_QUOTE_FLOW_ENABLED=false` until the controlled device test is ready.
10. Enable it for the controlled pilot, then verify launch -> authenticated `nfm_reply` -> Step 4 session -> Step 5 mapping/submission.

## Pilot evidence still required

The repository preparation does **not** satisfy the real-provider pilot. Before Step 6A can be called complete, capture and report:

- Meta Flow ID and DRAFT/PUBLISHED status (no credentials);
- Meta validation result or exact validation errors;
- preview result for all eight screens;
- Android launch/render/completion result;
- iOS result only if an iPhone is actually available;
- real authenticated `nfm_reply` structural shape with customer/private values redacted;
- resolved HestivaOS Flow session identity/outcome;
- canonical Quote or HUMAN_REVIEW result and duplicate-completion result;
- interruption test: leave Flow, send ordinary chat question, confirm guided Quote state is unchanged, then reopen/restart and record whether unfinished local form progress survived;
- fallback result when Flow is deliberately unavailable/disabled.

## PhotoPicker and PR #214

Step 6A does not implement or test production PhotoPicker retrieval. The frozen future PhotoPicker contract remains unchanged. Step 6B is a separate isolated provider-contract probe after the non-photo Flow works.

PR #214 remains untouched and must not be merged as part of this preparation.
