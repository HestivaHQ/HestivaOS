# ADR-0019: Contact-first Customers and Team navigation

- **Status:** Accepted
- **Date:** 2026-08-10

## Context

Ordinary Customer entry duplicated Name and Contact name, deployed soft navigation did not reliably continue after creation, and four workforce concerns occupied separate primary-sidebar positions.

## Decision

Contact name is the required human-facing field. Retain non-null `Customer.name` without migration or backfill, derive it from Contact name on new records and explicit contact edits, and use Contact name with legacy Name fallback for labels and search. A validated new-Customer response performs document navigation into Property creation; edits do not.

Primary navigation is Dashboard, Customers, Properties, Work orders, Team, and My profile. Team discloses Technicians, Crews, and Shift Planning from the shared responsive source. Employee Records and Services belong to Admin Settings while their established routes and authorization remain unchanged.

## Consequences

Legacy records remain readable and searchable, users enter a human name once, broken response IDs cannot create malformed continuation URLs, and workforce navigation is grouped without changing domain routes, roles, models, dependencies, or deployment configuration.
