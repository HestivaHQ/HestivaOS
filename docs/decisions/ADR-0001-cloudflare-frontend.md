# ADR-0001: Cloudflare for frontend hosting

Status:
Accepted

Date:
2026-08-07

Context:
The Next.js frontend needs a production runtime compatible with OpenNext, static assets, edge request handling, and observable deployments.

Decision:
Host `@hestiva/web` with OpenNext on Cloudflare Workers under Worker name `hestivaos`.

Consequences:
Frontend execution and assets share an edge platform. The team accepts OpenNext/Workers compatibility constraints and Cloudflare-specific operations.

Alternatives considered:
Railway web hosting; another managed Next.js host; self-hosted Node.js.

Review trigger:
Review if OpenNext compatibility, reliability, cost, performance, or application runtime requirements materially change.
