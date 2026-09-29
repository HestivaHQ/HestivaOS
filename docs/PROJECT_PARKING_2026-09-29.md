# Project parking checkpoint — 29 September 2026

## Status

HestivaOS / Homent development is intentionally parked as of 29 September 2026. This is a dormancy checkpoint, not a destructive teardown. The repository and reusable external assets are being retained so development can be resumed later.

The business did not proceed to normal trading. Corporate deregistration is being pursued separately and is not complete at this checkpoint.

## Runtime and service state

| Surface | Parking state |
| --- | --- |
| GitHub | Canonical source repository retained. Do not delete or archive solely because the project is dormant. |
| Railway API | Hobby subscription cancelled on 29 September 2026 and deployments stopped. Railway is no longer an active production runtime. |
| Railway configuration | Production environment variables were exported separately before cancellation. Secrets are intentionally not stored in this repository. |
| Supabase | Free project retained. Database/Auth/Storage remain the surviving hosted data plane and may automatically pause after inactivity. No independent database dump was completed at this checkpoint. |
| Cloudflare / domain | Domain and existing Cloudflare configuration retained for possible revival. |
| RegisterDomain hosting/email | Basic hosting/email service cancelled. |
| Meta | Existing Homent business/developer/Page/Messenger/WhatsApp assets retained. Production WhatsApp coexistence onboarding of the intended real number was not completed. |

## Regulatory state

- CIPC voluntary deregistration preparation is in progress but has not been submitted to completion.
- Beneficial Ownership filing is blocked pending CIPC guidance because the securities register shows 100 authorised securities, 0 issued securities, while the filing UI requires a Date Interest Issued. No share issue date or issued quantity should be invented to bypass validation.
- CIPC enquiry ticket: `TKT-260929-F389A153`.
- SARS eFiling registration remains pending. Corporate tax closure/deregistration must be handled separately when access and filing requirements are available.
- Do not describe Hestiva (Pty) Ltd as deregistered until authoritative CIPC records confirm that status.

## Preservation boundary

The Git repository preserves application source, committed migrations, documentation, CI configuration and Git history. It does **not** preserve external runtime secrets or the live contents/configuration of Railway, Supabase, Cloudflare or Meta.

A separately exported Railway production environment file exists outside Git. It contains secrets and must never be committed.

The live Supabase project currently remains the primary copy of the small amount of development/operational data accumulated during implementation. Before any future Supabase deletion, create and verify an independent logical database backup.

## Revival checklist

When development resumes:

1. Read this checkpoint before changing infrastructure.
2. Confirm the legal/company status first; do not assume the Hestiva entity still exists or can be reused.
3. Review current dependency/security advisories before deploying this historical codebase.
4. Restore or recreate runtime infrastructure from the repository and separately secured configuration; rotate credentials rather than assuming historical tokens are still valid.
5. Restore/verify Supabase and run only reviewed production migrations.
6. Re-establish Railway or another API host and update deployment documentation to the then-current topology.
7. Re-verify Cloudflare/domain, Meta permissions, webhook URLs and WhatsApp/Messenger configuration.
8. Run the repository's then-current full validation and production acceptance process before treating the system as live.

## Historical documentation

Existing deployment and operations documents describe the last active production/development topology and remain useful as historical/revival documentation. Where they conflict with this checkpoint about whether services are currently running, **this checkpoint is authoritative for the parked state from 29 September 2026 onward** until a later revival record supersedes it.
