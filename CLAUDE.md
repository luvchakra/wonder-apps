# WonderApps

Investor-facing portfolio site for five independent AI-native startups —
**WonderHome**, **WonderJobs**, **Wonder Creator**, **WonderArk** and **WonderID**
(formerly WonderAgent). Apple-style presentation:
dark/light bands, scroll-linked parallax, device frames, staged hero animation.
Pages are pre-rendered and refreshed every five minutes from the WonderApps
database (Supabase project `wonderapps`, ap-south-1), which holds the site's copy and
a daily history of every product's public engineering tracker — nothing about
visitors. One route handler emails contact-form submissions through the WonderApps
mailbox (GoDaddy SMTP); the messages are never stored.

## Commands

| Task      | Command             |
| --------- | ------------------- |
| Install   | `npm install`       |
| Dev       | `npm run dev`       |
| Lint      | `npm run lint`      |
| Typecheck | `npm run typecheck` |
| Build     | `npm run build`     |
| All gates | `npm run check`     |
| Progress  | `npm run progress`  |
| Backfill  | `npm run progress:backfill` |
| Back up copy | `npm run content:backup` |
| E2E (local build) | `npm run e2e -- [spec files]` |

`npm run check` (lint + typecheck + build) is the pre-push gate. There are no unit
tests yet.

## Testing and CI

Full guide: `docs/testing.md`.

- **Pull requests** (`.github/workflows/ci.yml`): typecheck, lint (changed files; everything when
  dependencies, TS/lint/build/test config, `vercel.json` or CI files change), dependency audit
  (blocks on production high/critical), secret scan, workflow lint (actionlint). Parallel, under a minute. No browser tests.
- **Push to main:** the same with the whole lint.
- **Nightly 03:00 IST** (`e2e-nightly.yml`): fresh build of `main`, the full Playwright suite in
  `e2e/`, retry once (passing on retry = flaky, needs a root cause), 25-minute budget that ends
  with a summary, report and traces kept 14 days. Also runs by hand with optional spec files.
- E2E runs against a local production build with no mail password, no product database URLs and
  no database write key. The app isn't live with real users yet, so specs may create test data
  freely; name it `e2e-…` and clean it up at the start of the nightly.
- **Rules:** never skip, disable or delete a test to make CI green. A red nightly is fixed before
  other work merges; find the root cause. Before merging something risky (dashboard sign-in, the
  contact form or mailer, migrations or the progress recorder, a cross-page flow), run the
  affected specs locally with `npm run e2e -- <specs>`. A change that adds, removes or renames a
  page or flow updates its spec in the same pull request.

## Stack

Next.js 16 App Router · React 19 · TypeScript · Tailwind CSS 4 · Framer Motion ·
lucide-react · zod · nodemailer (GoDaddy SMTP) · Supabase (read over its REST API, no client
library). System font stack on purpose (no external font
fetch at build time).

## Layout

```
DATABASE (public.content_documents) — ALL copy lives here, one JSON document per
  (kind, slug), validated by src/lib/content/schema.ts on every read:
  startup/<slug>    one record per product: problem, solution, market (incl. sourced
                    `figures`), model, moat, traction, roadmap, screens, links
  deck_copy/<slug>  short slide copy per product for the investor decks
  legal/<slug>      privacy / terms / cookies / disclaimer / accessibility / security
                    ({{url}}, {{contactEmail}}, {{lastUpdated}}… filled at render)
  site/main         tagline, positioning, description, jurisdiction, lastUpdated
  tracker/<slug>    how /appstracker describes a product: stage, methodology, row notes
DATABASE (public.progress_snapshots + _rows) — one snapshot per product per day
src/lib/content/    supabase.ts (REST reads, publishable key), schema.ts (zod),
                    load.ts (every read the site makes; cached, tag `content`/`progress`)
src/lib/progress/   record.ts (daily recorder), trends.ts (series for the charts)
supabase/migrations/  the schema, applied to the project; keep in step with it
supabase/seed/content.json  backup of the copy (`npm run content:backup`); the
                    database is the source of truth, not this file
src/content/        code that shapes the copy, not the copy itself:
  decks.ts          the slide model (`buildDeck`) shared by viewer and PDF
  site.ts           configuration: name, nav, legal links, canonical url
                    (wonderapps.biz) and contactEmail (connect@wonderapps.biz)
  progress.ts       tracker row types, totals and the traction template helpers
  types.ts          re-exports the content types from src/lib/content/schema.ts
src/components/     Hero, Showcase (landing chapter per product), StartupSections
                    (deep-dive page), Device (laptop/phone frames), Parallax,
                    Reveal, Stats (count-up), ContactForm, Nav, Footer
src/app/
  page.tsx                  landing
  startups/[slug]/page.tsx  deep dive, pre-rendered per product (new products need a build)
  decks/page.tsx            index of the five decks
  decks/[slug]/print/       printable 1920x1080 slides → source of the PDFs
  (legal)/[slug]/page.tsx   legal pages, pre-rendered from the legal documents
  contact/page.tsx          contact page (?interest=<slug> preselects a product)
  appstracker/page.tsx      portfolio engineering tracker (TrackerClient)
  api/contact/route.ts      POST → `src/lib/mailer.ts` (SMTP). Honeypot field, zod validation.
  api/tracker/route.ts      GET → reads the five products' tracker markdown
                            from raw.githubusercontent.com and returns parsed rows
  api/cron/progress/route.ts  daily (Vercel Cron) → records today's snapshot of every
                            tracker through record_progress_snapshot (PROGRESS_WRITE_KEY)
src/lib/tracker-parsers.ts  deterministic markdown-table parsers, one per product;
                            a parser THROWS when its table isn't found so the client
                            keeps the last good data instead of showing wrong numbers
docs/progress.md            GENERATED story-by-story progress across all five
                            products — regenerate with `npm run progress` (fetches
                            GitHub; `-- --local <dir>` reads local clones instead)
scripts/build-progress-doc.mjs  the generator
scripts/backfill-progress.ts    rebuilds snapshot history from each tracker's git log
public/screenshots/<slug>/  captures of the deployed products (desktop 1800w,
                            mobile 780w). WonderID's are public-page captures
                            (landing, sign-in) — never create an account on a
                            product's production to capture signed-in screens.
public/brands/<slug>/       logo lockups shipped by the products themselves
```

## Investor decks and market figures

- Each product has a deck: embedded `DeckViewer` (full screen, keyboard, swipe)
  on its page and a committed PDF in `public/decks/`. Slides are drawn at a fixed
  1920x1080 by `DeckSlides.tsx`. Pages pick up copy edits within five minutes, but
  the PDFs are files: after changing anything a deck reads (a `startup` or
  `deck_copy` document, live traction moving, slide components) run `npm run build
  && npm run decks && npm run build` and commit the PDFs (Next only serves `public/`
  files that existed at build).
- **Market figures** (`market.figures`) must each have a publisher URL you have
  opened and a quote you have matched on the page. Label forecasts with their base
  year and CAGR window; where publishers disagree, cite one with its definition —
  never blend or average. Dated figures stay dated (e.g. 2023 estimates).
- **Each startup stands alone.** Don't write copy that implies the products share
  a platform, chassis, customers or team; the legal security paragraph is per
  product on purpose. The tracker and footer are the only places they sit together.
- All five products now have a public help centre at `<product>/help` (Wonder Creator's went live 2026-10-08). `helpUrl` is kept as data, but no UI renders it (readers stay on the site).
- **No internal tech stack in public copy.** No database, framework, cloud or
  payment-provider names (Supabase, Postgres, RLS, Vercel, Razorpay/Stripe, model
  vendors), no test-framework or route/migration counts, in pages, decks or legal
  text. Say what the product does, not what it is built with. Product features that
  name a third party (WhatsApp, Alexa, Greenhouse, Okta…) are fine.
- **Keep readers on the site.** The only outbound links are one "Open the live
  product" per startup (deep-dive hero), each figure's source, and the tracker's
  repo link. Help-centre links are not rendered anywhere (`helpUrl` is kept as data).
- **Screenshots:** one phone capture per startup (`home-mobile`), the rest desktop.
  Devices are shown by `DevicePair` side by side — never overlapped or
  parallax-stacked, so no screenshot or page text is covered.
- **Phones are iPhones.** `.device-phone` (globals.css) draws the titanium rim,
  Dynamic Island, side buttons, status strip and home indicator, all in `cqw` so it
  scales with the frame; the capture sits below the strip so the island never
  covers a site header. `DeckSlides.tsx` has the same frame in inline styles.
- **Always a way back to the main page.** `BackToMain` (nav bar + above the footer,
  hidden on `/`) returns to `/` at the scroll position the reader left it;
  `ScrollMemory` (in the layout) stores the main page's `scrollY` and restores it
  after the Back button or the browser's back. External links open in a new tab.
- Every `mailto:` goes through `enquiryMailto()` (`src/lib/mailto.ts`) so it opens
  with a subject and a short template body.

## The WonderApps database

Founder's decision, 2026-10-15: the site's copy and the tracker history live in the
`wonderapps` Supabase project (this replaced the earlier "no database of our own" rule).

- **What it may hold:** site copy and progress snapshots. **Never** anything about a person:
  no contact-form messages, no visitor data, no product users' data. Product KPIs stay in
  the products and are read live (below), never copied here.
- **Reads** use the publishable key (in `src/lib/content/supabase.ts`, overridable with
  `WONDERAPPS_SUPABASE_URL` / `WONDERAPPS_SUPABASE_PUBLISHABLE_KEY`). Row-level security
  lets it read the public tables and write nothing.
- **Writes:** copy is edited by the owner in the Supabase table editor (`content_documents`);
  every change is kept in `private.content_revisions`, and a document that fails its schema
  breaks the build rather than the page. Snapshots are written only by
  `record_progress_snapshot(write_key, payload)`; the key is `PROGRESS_WRITE_KEY` in Vercel and
  only its SHA-256 is in the database (`private.write_keys`). The first snapshot of a day wins.
- **Live traction:** a traction item with `"live": true` is a template filled from the product's
  latest snapshot (`{done} / {total}`, `{pct}`, `{rowsDone}`…, see `tractionVars`), so pages,
  decks and the tracker quote one number.
- **Schema changes:** add a file to `supabase/migrations/` and apply the same SQL to the project.
  The Supabase tool used by Claude hangs on SQL containing DELETE; avoid it in functions.

## Founder dashboard (/dashboard) — private, dynamic

Full guide: `docs/dashboard/README.md`.

- **Product numbers are collected into WonderApps' own database and read from there** (founder's
  decision, 2026-10-18; this replaced "never stored here"). `src/lib/dashboard/store.ts` collects every
  period (7d/30d/90d/weekly/monthly) for every product through each product's read-only Postgres role
  (`<APP>_DATABASE_URL`; scripts in `docs/dashboard/*-readonly.sql`) once a day (`/api/cron/dashboard`,
  02:40 UTC), when the founder presses **Refresh** (`/api/dashboard/refresh`), and when a newsletter's
  period has no row from today. Only that collection opens a product database; pages and newsletters read
  `private.dashboard_snapshots` (migration 0004) through `public.dashboard_snapshots_latest`, written by
  `public.record_dashboard_snapshot`. Both functions require `PROGRESS_WRITE_KEY`; the table is in the
  private schema because the publishable key is public. Stored rows are finished aggregates (the metric
  results), never anything about a person. No stored row → a clear empty state, never zeros.
- **History and alerts.** Every collection keeps a row per day, so the overview draws people with an
  account and monthly active people day by day, and each product page its headline numbers over time
  (`public.dashboard_stat_history`, migration 0005: stat values only, from the rolling-7-day rows).
  History starts with the first collection; nothing is back-filled. When the daily run can't store, or a
  connected product is unreachable or partly read, everyone in `DASHBOARD_ALLOWED_EMAILS` gets one email
  (`src/lib/dashboard/alerts.ts`); an unconnected product is a setup state, not an alert.
- **Aggregates only.** Metrics live in `src/lib/dashboard/apps/<slug>.ts` against the contract in
  `src/lib/dashboard/types.ts`: single `SELECT`, only `$1..$4`, no user input in SQL, no emails/names/free
  text (labels that look like emails are blanked). `registry.ts` rejects non-SELECT SQL at build time.
  Adding a metric means adding its table/columns to that product's role script too.
- **Access.** `DASHBOARD_ALLOWED_EMAILS` + emailed one-time link bound to the requesting browser, signed
  12 h sessions (`DASHBOARD_SESSION_SECRET`). `src/proxy.ts` is the first gate and every page/route calls
  `requireSession()`/`getSession()` again. Never link `/dashboard` from the public site.
- **Newsletters** are built from the same stored data (`newsletter.ts`), sent through `src/lib/mailer.ts` by Vercel Cron
  (`vercel.json`, `CRON_SECRET`) or from `/dashboard/newsletter`. `DASHBOARD_DEMO=1` shows synthetic
  numbers locally and is ignored in production.
- **Development** (`/dashboard/development`, one section per app at `/development/<slug>`) shows each
  product's own progress files, read live from GitHub (`src/lib/dashboard/development.ts`, `DEV_SOURCES`;
  five-minute in-memory cache) and rendered as collapsible sections. Its numbers come only from the latest
  recorded progress snapshot (the daily progress cron parses the same file with the same parser as
  `/appstracker`); none recorded → no numbers, never zeros. Add or move a product's progress file in `DEV_SOURCES`.
- **Trends** come from the recorded snapshots: completion and stories done over time for the portfolio
  on `/dashboard/development`, done vs in scope and what moved in the last 7 days per product, and a
  "Build progress this period" section in every newsletter. Days between snapshots carry the last one
  forward; days before a product's first snapshot are gaps, never zeros.
- The public-copy rules above (no tech stack names) apply to the marketing site, not to this private page.

## The tracker (/appstracker)

- Renders each product's latest recorded snapshot (plus its `tracker` document) on the
  server, then fetches `/api/tracker` on mount and on the Refresh button. Live rows
  replace snapshot rows per product; a product whose fetch or parse fails keeps its
  snapshot and shows an inline warning. A product with no snapshot fails the render
  rather than showing zeros. Never let a parse failure produce zeros.
- Parsers find tables by exact header cells, not line numbers. If a product
  changes its tracker layout, fix the parser in `src/lib/tracker-parsers.ts`
  and re-run it against the repo's file before shipping.
- WonderHome is read from its generated `docs/PROGRESS.md` "By module" table;
  its hand-kept `tracking/PROGRESS.md` module table drifts from the backlogs.
- "Set aside" = deferred or superseded work. It's excluded from the active
  completion denominator and drawn hatched, never as a status colour.
- Status colours are the fixed dataviz palette (`--good`, `--warn`); text never
  wears them.
- `docs/progress.md` is generated, never hand-edited. Regenerate it in the same
  change whenever the tracker parsers or the products' trackers move.

## Rules that matter here

- **Never invent traction.** Every number on the site traces to a product's
  public engineering tracker or live site. If you cannot cite it, don't add it.
- WonderAgent was renamed **WonderID** on 2026-09-26 by the founder (repo
  `wonder-agent` unchanged). Its address is `id.wonderapps.biz`; the old
  `agent.wonderapps.biz` was retired by the founder on 2026-10-10 — never link,
  redirect or re-add it. Slug is `wonderid`;
  `/startups/wonderagent` redirects permanently (next.config.ts) and the contact
  page maps `?interest=wonderagent`. Say "formerly WonderAgent" once per page at
  most, not everywhere.
- Completion percentages are floored, never rounded up: 223 of 224 is 99%.
- Help-centre links (`helpUrl`): all five are public (WonderHome's opened by
  2026-10-15).
- Each product's `url`/`helpUrl` point to its custom domain (`home.`, `jobs.`,
  `creator.`, `ark.`, `id.` — all `.wonderapps.biz`), the products' intended addresses.
  If a domain isn't cut over yet, that's an infra step outside this repo, not
  a reason to revert the copy — verify with a request before assuming stale.
- `site.contactEmail` (`connect@wonderapps.biz`) is the one address for every
  product; only the business name next to it changes per placement.
- Screenshots go through `next/image` with `object-cover object-top` inside a
  fixed-aspect device frame, so any capture size works — don't hand-crop.
- Animations must respect `prefers-reduced-motion` (MotionConfig does this;
  CSS keyframes are disabled in the media query in `globals.css`).
- Dark bands use the `.theme-dark` class; light bands `.theme-light`. Tokens are
  CSS variables — don't hardcode colours in components except per-product
  accents, which come from `startups[n].accent`.

## Build-slot budget (Vercel deployments)

The project lives in the Vercel Hobby account `kunals-projects-9f64757f`
(`team_nGnxn1FrUI78kVpMm12R7FIF`; moved from `luvchakras-projects` on 2026-10-15, same
project id `prj_eAN93HE8LG4URCWU0JlhBQtokWuM`). That account caps deployments per day,
and the cap is shared with WonderHome, which is in the same account. Every deployment Vercel *creates* counts, including
ones an ignored-build step cancels. Running out blocks production, so treat
deployments as a scarce budget with production first.

- **Merge automatically once the work is verified** (founder's decision, 2026-10-15;
  this replaced waiting for "merge now"). Every change goes through a pull request,
  never a direct push to `main`. When a change is finished and `npm run check` passes
  (plus `npm run decks` when a deck changed), push the branch, open the pull request,
  wait for its CI to pass, squash-merge it to `main` yourself, then check the production
  deployment reaches Ready and the changed pages are live. Don't ask first.
  Still one merge per finished change: no merging half-done work to "see it live",
  and if several pull requests are ready at the same time, land them together so
  they cost one deployment. Hold the merge and ask instead only when the budget
  below says to stop, when CI on the pull request is red, when the last nightly E2E
  run is red (fix that first), or when the change
  alters public numbers or legal text in a way the founder hasn't seen.

- **Only `main` deploys.** `vercel.json` → `git.deploymentEnabled` turns off
  `claude/**`, `ccr-**`, `feature/**` and `dependabot/**`; keep it that way and add any new
  working-branch prefix there. No previews unless someone will open one. One
  Vercel project per repo.
- **One merge to `main` = one production deployment.** Squash-merge, and put docs,
  `docs/progress.md`, decks and CLAUDE.md updates in the same pull request as the
  code they describe. No docs-only pull requests while a code pull request is open
  or about to open.
- **Verify before pushing** — `npm run check` (lint + typecheck + production build),
  and `npm run decks` locally when a deck changed — then push the branch once, when
  it is ready. No fix-up pushes.
- **Watch the budget.** Before deployment-heavy work, count the account's deployments
  in the last 24 hours (every project in it). Above ~70% of the cap, stop docs-only
  merges and keep the rest for production and hotfixes.
- **When the cap is hit:** stop merging to `main` (refused deployments are not
  queued), wait until the oldest counted deployment is 24 hours old, then redeploy
  only the latest `main`, once. A "rate limited" status is infrastructure, not a
  failure in this repo.

## Environment

See `.env.example`. All email (contact form, dashboard sign-in links, newsletters)
goes through one module, `src/lib/mailer.ts`: GoDaddy Workspace Email over SMTP,
signed in as `connect@wonderapps.biz`. Never use Resend or another email API. `SMTP_PASS` and
`CONTACT_RECIPIENTS` (comma-separated) are required for the contact form to send;
without them the route returns 503 with a clear message and logs the reason.
`SMTP_HOST`/`SMTP_PORT`/`SMTP_USER` default to `smtpout.secureserver.net`/`465`/
`connect@wonderapps.biz`. GoDaddy only relays mail from the signed-in mailbox, so
`CONTACT_FROM`/`NEWSLETTER_FROM` must stay on it.

The database needs no variable to read (the publishable key is in code). The daily
progress recorder needs `PROGRESS_WRITE_KEY` (and `CRON_SECRET`); without them it
returns 503 and the site keeps showing the last recorded day. To rotate the key, set a
new one in Vercel and its hash in the SQL editor:
`update private.write_keys set sha256 = extensions.digest('<key>', 'sha256') where name = 'progress';`

## Session startup

`.claude/hooks/session-start.sh` installs dependencies on Claude Code on the web
by detecting `package.json` (npm here). Nothing else is needed.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
