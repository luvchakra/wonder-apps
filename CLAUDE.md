# WonderApps

Investor portfolio site for five AI-native startups: WonderHome, WonderJobs, Wonder Creator,
WonderArk, WonderID (formerly WonderAgent). Next.js 16, React 19, TypeScript, Tailwind 4,
Framer Motion, zod, nodemailer (GoDaddy SMTP), Supabase over REST. Pages pre-render from
Supabase every five minutes. System font stack on purpose.

## Every session

- Next.js 16 here is not the version you know: read the note at the end of this file before writing code.
- Setup: `.claude/hooks/session-start.sh` installs npm dependencies on the web.
- Pre-push gate: `npm run check` (lint, typecheck, unit tests, build). Add `npm run decks` when a deck changed.
- Replies: the outcome and what to check, not the steps.
- Token rules: see Token economy.

## Commands

Scripts: `package.json`. Gate `npm run check`; E2E `npm run e2e -- [specs]`; decks `npm run decks`; progress `npm run progress` (`-- --local <dir>`) and `npm run progress:backfill`.

## Layout

Full map: `docs/architecture.md`. Copy lives in Supabase `content_documents`, read by `src/lib/content/` (`schema.ts` validates). Snapshots: `src/lib/progress/`. Shared code: `src/content/`. Tracker: `src/lib/tracker-parsers.ts`. Mail: `src/lib/mailer.ts`.
- Never hand-edit `docs/progress.md` (generated). Schema: `supabase/migrations/`. `supabase/seed/content.json` is a backup; the database is the source of truth.

## Decks, figures and copy

- A deck is an embedded `DeckViewer` plus a committed PDF in `public/decks/` (`DeckSlides.tsx`, 1920x1080). After changing a deck's inputs (`startup` or `deck_copy` documents, live traction, slide components), run `npm run build && npm run decks && npm run build` and commit the PDFs. Next serves only `public/` files that existed at build.
- Each `market.figures` entry needs a publisher URL you opened and a quote you matched on the page. Label forecasts with base year and CAGR window. Where publishers disagree, cite one with its definition; never blend or average. Keep dated figures dated.
- Startups stand alone: no copy implying a shared platform, chassis, customers or team. The per-product legal security paragraph is deliberate; only the tracker and footer show them together.
- No internal tech stack in public pages, decks or legal text: no database, framework, cloud, payment or model-vendor names, no test-framework or route/migration counts. Third-party product features (WhatsApp, Alexa, Greenhouse, Okta) are fine. The dashboard is exempt.
- Outbound links only: "Open the live product" (deep-dive hero), figure sources, the tracker's repo link. Help centres (`<product>/help`) are public; `helpUrl` is data, never rendered.
- Product `url`/`helpUrl` use custom domains (`home.`, `jobs.`, `creator.`, `ark.`, `id.`, all `.wonderapps.biz`). If one isn't cut over, that is infrastructure: don't revert copy; verify with a request first.
- `site.contactEmail` (`connect@wonderapps.biz`) is the one address for every product; only the business name beside it changes. Every `mailto:` goes through `enquiryMailto()` (`src/lib/mailto.ts`).
- **Never invent traction.** Every number traces to a product's public tracker or live site. Completion percentages are floored: 223 of 224 is 99%.
- Changes to public numbers or legal text need the founder's review before merge.
- WonderAgent became **WonderID** on 2026-09-26 (repo `wonder-agent` unchanged). Address `id.wonderapps.biz`; `agent.wonderapps.biz` was retired on 2026-10-10: never link, redirect or re-add it. Slug `wonderid`; `/startups/wonderagent` redirects (`next.config.ts`); contact maps `?interest=wonderagent`. Say "formerly WonderAgent" at most once per page.

## Pages and components

- Device frames, screenshots, the way back to `/` (`BackToMain`, `ScrollMemory`) and theme details: `docs/ui.md`. Rules: one phone capture per startup; devices never overlap or get hand-cropped; WonderID shows public pages only; the way back returns to `/` at the scroll position left; dark and light bands use `.theme-dark` and `.theme-light`; colours are CSS variables; motion respects `prefers-reduced-motion`.
- `startups/[slug]` is pre-rendered, so a new product needs a build.

## Database (Supabase `wonderapps`)

Founder's decision, 2026-10-15: copy and tracker history live here.

- Holds site copy and progress snapshots. **Never** anything about a person: no contact messages, visitor data or product users' data. Product KPIs are read live by the dashboard, never copied here.
- Reads use the publishable key in `src/lib/content/supabase.ts` (override: `WONDERAPPS_SUPABASE_URL`, `WONDERAPPS_SUPABASE_PUBLISHABLE_KEY`). Row-level security allows reads of public tables and no writes.
- Copy: one JSON document per (kind, slug), validated by `schema.ts` on every read. The owner edits it in the table editor; changes are kept in `private.content_revisions`. A document that fails its schema breaks the build, not the page.
- Snapshots are written only by `record_progress_snapshot(write_key, payload)`. `PROGRESS_WRITE_KEY` is in Vercel; only its SHA-256 is in `private.write_keys`. The first snapshot of a day wins.
- Live traction: a traction item with `"live": true` is a template filled from the latest snapshot (`tractionVars`: `{done}`, `{total}`, `{pct}`, `{rowsDone}`…), so pages, decks and the tracker quote one number.
- Schema: add a file to `supabase/migrations/` and apply the same SQL to the project. The Supabase tool hangs on SQL containing DELETE; avoid it in functions.

## Tracker (/appstracker)

- The server renders each product's latest snapshot plus its `tracker` document; the client fetches `/api/tracker` on mount and Refresh and replaces snapshot rows per product. A failed fetch or parse keeps the snapshot with an inline warning; no snapshot fails the render. Never let a parse failure produce zeros.
- Parsers find tables by exact header cells (never line numbers) and throw when one is missing. On a layout change, fix the parser and test it on the repo's file before shipping.
- WonderHome is read from its generated `docs/PROGRESS.md` "By module" table, not the hand-kept `tracking/PROGRESS.md` (it drifts).
- "Set aside" = deferred or superseded: excluded from the active completion denominator, drawn hatched, never a status colour. Status colours (`--good`, `--warn`) are the fixed dataviz palette; text never wears them.
- Regenerate `docs/progress.md` in the same change whenever the parsers or a tracker move.

## Founder dashboard (/dashboard): private

Full guide: `docs/dashboard/README.md`.

- Pages never open a product database. Only collection does (daily 02:40 UTC cron, Refresh, or a newsletter whose period has no row from today), through each product's read-only role (`docs/dashboard/*-readonly.sql`). Pages and newsletters read `public.dashboard_snapshots_latest`.
- Stored rows are finished aggregates, never anything about a person. No stored row → empty state, never zeros.
- Metrics (`src/lib/dashboard/apps/<slug>.ts`, contract in `types.ts`): one `SELECT` using only `$1..$4`; no user input in SQL; no emails, names or free text. `registry.ts` rejects non-SELECT SQL at build. A new metric also needs its columns in that product's role script.
- History: one row per day from the first collection; nothing is back-filled. Trends carry the last snapshot forward; days before a product's first snapshot are gaps, never zeros.
- Alerts (`src/lib/dashboard/alerts.ts`): a failed store, or a connected product unreachable or partly read, emails everyone in `DASHBOARD_ALLOWED_EMAILS`. An unconnected product is a setup state, not an alert.
- Access: one-time emailed link to allowed emails, bound to the requesting browser; 12-hour sessions signed with `DASHBOARD_SESSION_SECRET`. `src/proxy.ts` is the first gate; every page and route also calls `requireSession()` or `getSession()`. Never link `/dashboard` from the public site.
- Newsletters (`newsletter.ts`) use the same data. `DASHBOARD_DEMO=1` shows synthetic numbers locally and is ignored in production.
- `/dashboard/development` reads progress files live from GitHub (`DEV_SOURCES`, `src/lib/dashboard/development.ts`). Its numbers come only from the latest recorded snapshot; none → no numbers.
- The dashboard's database functions require `PROGRESS_WRITE_KEY`; its table is private because the publishable key is public.

## Careers (/careers): run by WonderJobs

Mechanics: `docs/careers.md`.

- `/careers`, `/careers/<id>` and `/careers/status?t=…` show WonderJobs' open jobs and forward applications. This site stores and logs nothing about applicants (logs: job id, status, time).
- `src/lib/careers/wonderjobs.ts` is the only WonderJobs client (server-only). The browser calls only `/api/careers/apply` and `/api/careers/status`. Status tokens travel in request bodies, never in URLs. POSTs are never retried.
- The career-site key `wjcs_…` is entered at `/dashboard/careers`, encrypted at rest, shown masked, and every save or clear is audited. `WONDERJOBS_CAREERS_KEY` is only the fallback. Never show sample jobs.
- The careers address registered with WonderJobs is `https://wonderapps.biz/careers`.

## Hardening

- `next.config.ts` sends CSP (`frame-ancestors 'none'`, `object-src 'none'`), nosniff, COOP, Referrer-Policy and HSTS; no `X-Powered-By`, no browser source maps. `robots.txt` disallows AI crawlers.
- `/api/contact` and `/api/tracker` have generous per-IP limits (429 + Retry-After, logged). Modules that hold secrets import `server-only`.
- Draft terms for counsel: `docs/legal/TERMS-DRAFT.md`.

## Environment

- Variables: `.env.example`. Defaults and key rotation: `docs/operations.md`.
- All email (contact form, dashboard sign-in, newsletters) goes through `src/lib/mailer.ts`: GoDaddy Workspace SMTP as `connect@wonderapps.biz`. Never Resend or another email API. `CONTACT_FROM` and `NEWSLETTER_FROM` must stay on that mailbox; GoDaddy relays only from it.
- The contact form needs `SMTP_PASS` and `CONTACT_RECIPIENTS` (comma-separated); without them it returns 503 and logs why.
- The progress recorder needs `PROGRESS_WRITE_KEY` and `CRON_SECRET`; without them it returns 503 and the site keeps the last day.

## Testing and CI

Full guide: `docs/testing.md`.

- Never skip, disable or delete a test to make CI green.
- A red nightly is fixed before other work merges. Find the root cause; a test that passes only on retry is flaky and needs one.
- Before merging something risky (dashboard sign-in, contact form or mailer, migrations or the progress recorder, a cross-page flow), run its specs locally: `npm run e2e -- <specs>`.
- A change that adds, removes or renames a page or flow updates its spec in the same PR.
- E2E runs with no mail password, product database URLs or write key. Specs may create test data; name it `e2e-…` (the nightly deletes it at start).

## Shipping and Vercel budget

- Merge automatically once verified (founder's decision, 2026-10-15). Never push to `main`. When `npm run check` passes (plus `npm run decks` if a deck changed): push once, open the PR, wait for CI, squash-merge it yourself, confirm the production deployment is Ready and the changed pages are live. Don't ask first.
- Hold and ask only if the budget says stop, PR CI is red, the last nightly is red (fix it first), or public numbers or legal text would change before the founder has seen them.
- Verify before pushing; no fix-up pushes.
- One merge = one production deployment. Never merge half-done work; land ready PRs together. Docs, `docs/progress.md`, decks and CLAUDE.md updates go in the same PR as the code they describe. No docs-only PRs while a code PR is open or about to open.
- Only `main` deploys: `vercel.json` → `git.deploymentEnabled` disables `claude/**`, `ccr-**`, `feature/**`, `dependabot/**`. Add new working-branch prefixes there. No previews unless someone will open one.
- Budget: the daily cap is shared with WonderHome and counts every deployment Vercel creates, even one an ignored-build step cancels. Before deployment-heavy work, count the account's deployments in the last 24 hours across all projects. Above ~70%: no docs-only merges; keep the rest for production and hotfixes.
- Cap hit: stop merging (refused deployments are not queued). Wait until the oldest counted deployment is 24 hours old, then redeploy the latest `main` once. "Rate limited" is infrastructure, not a failure here.
- Account and project IDs: `docs/operations.md`.

## Token economy

Each turn re-reads this file and the conversation, so cost ≈ context × turns.

- Keep sessions short: start a new one or `/compact` after each batch of finished work. State lives in `docs/` and PRs, not in chat.
- Batch related small requests into one branch and PR. Add to the open PR while its CI runs.
- CI waits: after pushing, subscribe to the PR and end the turn. When the CI event arrives, read the check results once and merge or fix in that turn. No sleep loops, polling or repeated status checks.
- Text before pixels: `node scripts/ui-check.mjs <path> [--click ROLE:NAME] [--find ROLE:NAME] [--shot out.jpg]` prints each matched element's text and box. Screenshot only when the look matters: one per change, cropped, JPEG q60. Never read full traces, videos or full-page screenshots; read `npm run e2e:summary`.
- Read narrowly: `grep -n` first, then only the line ranges you need. Don't re-read files already in context or just edited.
- Never read these whole: `docs/progress.md` (640 KB; grep it), `package-lock.json`, `supabase/seed/content.json`, `docs/dashboard/*-readonly.sql`, `public/decks/*.pdf`, images and video.
- Quiet output: `git -q`, `npm --silent`, `tail` or `grep` for failures. Run only the touched area's tests (`node --import tsx --import ./tests/stub-server-only.mjs --test tests/<file>`). `npm run check` is the pre-push gate, not a loop step.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
