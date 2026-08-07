# ADR-0003: Supabase for database, authentication, and storage

Status:
Accepted

Date:
2026-08-07

Context:
Hestiva OS requires relational persistence, user identity, and object storage without maintaining three bespoke infrastructure systems.

Decision:
Use Supabase PostgreSQL for the Prisma database, Supabase Auth for identity, and Supabase Storage for application assets.

Consequences:
One platform reduces infrastructure surface and provides integrated capabilities. Supabase availability is a shared dependency, configuration must be recovered from the correct project, and portability differs by capability.

Alternatives considered:
Independently managed PostgreSQL, a separate identity provider, separate object storage, or self-hosting these services.

Review trigger:
Review if availability, scale, security, compliance, cost, backup, or portability requirements exceed the platform fit.
