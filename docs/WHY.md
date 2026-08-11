# Why the production system is structured this way

## Canonical operational services

The authenticated OS, rather than public marketing presentation, is the durable owner of operational service identity. A single classified Service record prevents primary services and add-ons from being confused, preserves historical relationships through deactivation, and keeps ordinary workflows on controlled selections. The public website remains a presentation and quote-flow consumer; future synchronization must reconcile to OS identity instead of creating live coupling or parallel catalogue ownership.

These explanations summarize current accepted decisions; the ADRs are authoritative records.

## Cloudflare for frontend hosting

Cloudflare Workers can run the Next.js frontend through OpenNext and serve it near users while native Git builds provide a direct path from authoritative `main` to Worker `hestivaos`. This keeps web build and runtime ownership together. **May change:** review if framework compatibility, operating needs, or cost no longer fit.

## Railway for API hosting

Railway provides a managed long-running environment for the NestJS API, root-workspace builds, health checks, configuration, and rollback controls. It separates API lifecycle and database migration concerns from the edge frontend. **May change:** the hosting provider is replaceable if reliability or operational requirements demand it; the legacy hostname will change.

## Supabase for database, authentication, and storage

One managed platform supplies PostgreSQL, user authentication, and object storage, reducing bespoke infrastructure while preserving PostgreSQL access through Prisma. **May change:** individual capabilities can be reassessed as scale, security, or portability needs evolve.

## GitHub as source of truth

`HestivaHQ/HestivaOS` on `main` provides the reviewed, auditable input to both deployment systems. Platform console edits are limited to protected values and controller settings; code/config changes belong in Git. This is an enduring principle even if the source-control vendor changes.

## npm workspaces

The `hestiva-os` root coordinates `@hestiva/api` and `@hestiva/web`, provides one dependency graph, and allows explicit workspace build commands from the repository root. **May change:** tooling can evolve, but monorepo commands must remain deterministic for deployers.

## One deployment authority

Only one controller should automatically deploy a given service. Multiple controllers can race, deploy different environment scopes, obscure provenance, and make rollback unsafe. Cloudflare native Git is therefore the sole active web authority; the GitHub Actions web deployment path has been removed and Railway web auto-deployment is disabled. **Temporary:** the Railway web service itself remains only as a rollback fallback and is planned for removal.

## Daily-command-centre dashboard

The launch Admin dashboard prioritizes today's operating decisions rather than historical analytics: schedule, actionable exceptions, current workflow state, and the next seven calendar days. This keeps the first product slice focused and makes unresolved conditions disappear when their underlying work orders change. Existing broader API fields are retained for compatibility instead of coupling presentation simplification to repository-wide backend deletion. Africa/Johannesburg calendar boundaries represent the business day consistently regardless of server location.


## Why the Business Profile is canonical and conservative

Company information needs one reusable source so future quotations, invoices, emails, and generated documents do not drift. A database-enforced singleton with typed core fields is sufficient for the current one-company product and avoids premature multi-tenancy. Typed share booleans make every outgoing choice reviewable and evolvable without treating sharing as authorization. Public general details default on for useful first-run behavior, while banking and compliance details default off to avoid surprise disclosure. Exact ADMIN-only read and edit access is the current verified requirement; management view/share groups remain a future decision rather than speculative permissions.

## Why Employee Records are separate

Hestiva needs workforce details for people who may not use Hestiva OS and may not perform technician field work. A separate lean Employee Record avoids making authentication identity into an HR record or forcing office employees into the Technician scheduling graph. Optional unique links preserve useful OS-access and operations summaries while keeping their lifecycle authorities independent. The scope is intentionally operational rather than a full HRIS.

## 2026-08-10 — Contact-first customers and grouped workforce navigation

Hestiva's present workflow treats a Customer as the person represented by Contact name, so a second required Name input creates duplicate work without adding operational meaning. The retained database Name remains a compatibility field and legacy fallback rather than being destructively removed. The operational sidebar follows Customer → Property → Work Order creation, while Technicians, Crews, and Shift Planning express one Team concern. Employee Records and Services remain administrative ownership areas rather than daily operational destinations.

## Automatic Work Order identity

A Work Order reference identifies a job without embedding changing business meaning or personal data. Service, Customer, and Property remain canonical relationships used to derive the useful label; an Africa/Johannesburg daily database counter makes the human-readable reference authoritative under concurrent server creation. Legacy title fallback preserves history without inventing past sequence order.

## Accepted-quote ownership boundary

Accepted quote data is split by its natural lifetime so operators do not re-enter canonical information and a visit does not become a duplicate customer/property store. Customer owns identity/contact, Property owns persistent home/access context, and Work Order owns the selected primary service, visit add-ons, quoted frequency snapshot, current home condition, timing, and visit instructions. A future recurring agreement will own recurrence because a long-lived agreement and an individual operational visit have different lifecycles. This keeps Slice 5I ready for a later quote handoff without prematurely coupling the OS to the website or building a recurrence engine.

## Persistent Property operational ownership

Repeatedly collecting stable home and household facts per visit creates conflicting copies and burdens operators. Property therefore owns the reusable operational profile, while Work Order retains only visit-specific operational facts and exceptions. Nullable additive fields preserve honest “unknown” state for existing homes. Lean relationship selectors deliberately omit household notes; an assigned Technician can still read actionable live context through the authorized Work Order view. This decision avoids premature recurrence, quote-handoff, scope, and snapshot models.

## Why one Service can be available in both booking contexts

The current website presents Interior Window Cleaning and Laundry Folding as both a primary selection and an add-on. Hestiva OS therefore marks one canonical capability `BOTH` rather than creating name-suffixed duplicates with diverging IDs. This preserves the distinction between the sold capability and its booking context while retaining existing Work Order primary and add-on relationships. No Service Scope model is justified because the current authoritative quote flow exposes no scope choices.

## 2026-08-11 — Why recurring service is a separate operational record

An ongoing commitment changes over time while a Work Order must preserve one visit's instructions and accepted values. A Property-owned agreement therefore holds recurrence and lifecycle, while generation snapshots visit data into an independently operated Work Order. Explicit one-visit generation and database occurrence uniqueness favor reviewable queues and concurrency safety over an uncontrolled scheduler.

## 2026-08-11 — Why the website Quote boundary is versioned and server-to-server

The public website and the operational OS have different responsibilities. The website should optimize customer capture and presentation, while HestivaOS owns official Quote identity, pricing, history, storage provenance, and eventual operational import. A versioned structured payload prevents email prose, display labels, or duplicated pricing logic from becoming hidden business interfaces that drift independently.

A stable submission UUID and photo identity/hash make retries deterministic rather than depending on whether a browser saw a response. Keeping the private integration server-to-server prevents a long-lived integration credential from becoming a browser secret. Delaying the runtime endpoint until authentication, pricing, storage reconciliation, idempotent replay, and atomic persistence can be delivered together prevents a partially implemented boundary from accepting customer requests that it cannot safely complete.
