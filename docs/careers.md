# Careers (/careers): mechanics

The rules are in the Careers section of `CLAUDE.md`. This file holds the detail.

## Pages and routes

- `/careers`: open jobs from WonderJobs. `/careers/<id>`: one job. `/careers/status?t=…`: an
  applicant's status, using the token from their application.
- `/api/careers/apply` and `/api/careers/status`: same-origin routes the browser calls, with
  per-IP limits.

## Client (`src/lib/careers/wonderjobs.ts`)

- Server-only. The base URL is fixed; the only override allowed is `https://*.wonderapps.biz`.
- 8 s timeout per request.
- GETs are retried once on a network error or a 5xx. POSTs are never retried.
- The job list is cached for 60 s. Nothing else is cached.
- A `Retry-After` from WonderJobs is passed on.

## Key (`src/lib/careers/key.ts`, `crypto.ts`)

- The career-site key (`wjcs_…`) is pasted at `/dashboard/careers`. It is stored AES-GCM
  encrypted (migration `0006`), shown masked, and every save or clear is audited.
- The encryption secret is `CAREERS_KEY_SECRET`, or `DASHBOARD_SESSION_SECRET` when that is unset.
- `WONDERJOBS_CAREERS_KEY` is only a fallback when no key is saved.

## Privacy

- This site stores nothing about applicants. The logs hold job id, status and time only.
- WonderJobs stores applications, emails applicants and the hiring team, and deletes them.
- The status token travels in request bodies, never in a URL.
