# WonderApps

Investor portfolio site for five independent AI-native startups: **WonderHome**,
**WonderJobs**, **Wonder Creator**, **WonderArk** and **WonderID**. Each has its
own deep-dive page, cited market figures and a downloadable investor deck.

Next.js site with Apple-style presentation. Its copy and a daily history of every
product's public engineering tracker live in the WonderApps database (Supabase project
`wonderapps`, Mumbai); pages are pre-rendered from it and refresh within five minutes of
an edit. The contact form emails submissions through the WonderApps mailbox (GoDaddy
Workspace Email over SMTP) and stores nothing.

## Run it

```bash
npm install
cp .env.example .env.local     # fill in SMTP_PASS and CONTACT_RECIPIENTS
npm run dev                    # http://localhost:3000
npm run check                  # lint + typecheck + production build
```

## Configure

| Variable | Purpose |
|---|---|
| `SMTP_PASS` | Password of the sending mailbox (server-side only). |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` | Optional; default to `smtpout.secureserver.net`, `465`, `connect@wonderapps.biz`. |
| `CONTACT_RECIPIENTS` | Comma-separated inboxes that receive every contact-form message. |
| `CONTACT_FROM` | Optional From line; must be the SMTP mailbox, e.g. `WonderApps <connect@wonderapps.biz>`. |
| `NEXT_PUBLIC_SITE_URL` | Optional canonical URL for metadata and the sitemap. |

Set the same variables in Vercel → Project → Settings → Environment Variables.

## Deploy

The repo is linked to the Vercel project `wonder-apps` (id `prj_eAN93HE8LG4URCWU0JlhBQtokWuM`).
On 2026-10-15 the project moved, with its id, environment variables, domains and Git
connection, from the `luvchakras-projects` team to the Hobby account
**`kunals-projects-9f64757f`** (`team_nGnxn1FrUI78kVpMm12R7FIF`), which also holds
WonderHome. Dashboard: `https://vercel.com/kunals-projects-9f64757f/wonder-apps`. Tools
and the CLI need that scope (`vercel --scope kunals-projects-9f64757f …`). The old team
returns 403 for this project.

Only `main` deploys: `vercel.json` → `git.deploymentEnabled` turns off the working-branch
prefixes (`claude/**`, `ccr-**`, `feature/**`, `dependabot/**`), so no previews spend
build slots (see the build-slot budget in `CLAUDE.md`). `vercel.json` also pins the
Next.js framework preset, the `bom1` (Mumbai) function region, matching the data
residency of the products themselves, the daily progress recorder (01:10 UTC) and the
two newsletter crons.

### What is set in Vercel (checked 2026-10-15)

Production environment variables (Settings → Environment Variables), all present:

| Needed for | Variables |
|---|---|
| Contact form | `SMTP_PASS`, `CONTACT_RECIPIENTS`, `CONTACT_FROM` |
| Dashboard sign-in | `DASHBOARD_ALLOWED_EMAILS`, `DASHBOARD_SESSION_SECRET` (32+ chars) |
| Dashboard data | `WONDERHOME_DATABASE_URL` … `WONDERID_DATABASE_URL` (read-only roles, see `docs/dashboard/README.md`) |
| Newsletters | `CRON_SECRET` (16+ chars), `NEWSLETTER_CADENCE` (`weekly`) |
| Progress history | `PROGRESS_WRITE_KEY` (the daily recorder's write key; only its hash is in the database) |

Not set, on purpose: `NEXT_PUBLIC_SITE_URL` (defaults to `https://wonderapps.biz`),
`NEWSLETTER_RECIPIENTS` (defaults to `DASHBOARD_ALLOWED_EMAILS`) and `SMTP_HOST`/`SMTP_PORT`/
`SMTP_USER` (default to the GoDaddy mailbox). Never set `DASHBOARD_DEMO` in production
(it is ignored there anyway).

Domains: `wonderapps.biz` serves the site and matches the canonical URL in
`src/content/site.ts`; `www.wonderapps.biz` redirects to it (308, path and query kept;
switched 2026-10-15); `wonder-apps.vercel.app` is the Vercel alias. Preview deployments sit behind Vercel
Authentication. Changing a variable takes effect on the next production deployment,
which follows the build-slot rules in `CLAUDE.md`.

## Edit the content

All copy lives in the database table `content_documents`. Edit it in the Supabase dashboard
(project `wonderapps` → Table Editor → `content_documents`), one JSON document per row:

| kind / slug | What it holds |
|---|---|
| `startup/<slug>` | one product: problem, solution, how it works, market (with sourced figures), business model, moat, traction, roadmap, ask, screenshots, live + help-centre links |
| `deck_copy/<slug>` | the short slide copy for that product's investor deck |
| `legal/<slug>` | Privacy, Terms, Cookies, Investor Disclaimer, Accessibility, Security (`{{contactEmail}}`, `{{url}}`, `{{lastUpdated}}`… are filled in) |
| `site/main` | tagline, positioning, description, jurisdiction, "last updated" date |
| `tracker/<slug>` | how `/appstracker` describes a product: stage, methodology, notes per row |

- Pages show an edit within five minutes, no deployment needed. A document that doesn't match
  its schema (`src/lib/content/schema.ts`) is not shown: the page keeps its last good version and
  the next build fails with the field that's wrong.
- Every edit is kept in `private.content_revisions` (old and new JSON, who, when).
- A traction item with `"live": true` is filled from the product's latest tracker snapshot:
  `"value": "{done} / {total}"`, `"note": "{pct}% done; {partial} partial"`. Available:
  `{done} {total} {active} {remaining} {partial} {notStarted} {setAside} {pct} {rows} {rowsDone}`.
- The investor-deck PDFs are files, so after a change a deck reads, rebuild them (below).
- `npm run content:backup` writes the current copy to `supabase/seed/content.json` for git history.
- Site name, address, contact email and navigation are configuration in `src/content/site.ts`.

Screenshots live in `public/screenshots/<product>/`; add a file and reference it in the product's `screens` array.

## Tests and CI

Pull requests run fast checks only (typecheck, lint, dependency audit, secret scan); the
browser suite in `e2e/` runs every night at 03:00 India time against a fresh build, and by hand.
Run chosen specs locally with `npm run e2e -- e2e/contact.spec.ts`. Details: [`docs/testing.md`](docs/testing.md).

## Progress history

Every product's public tracker is recorded once a day (`/api/cron/progress`, same parsers as
`/appstracker`) into `progress_snapshots`. `npm run progress:backfill` rebuilt the days before
recording began from each tracker's git history (needs `PROGRESS_WRITE_KEY`; safe to re-run,
the first snapshot of a day wins). The founder dashboard turns this into trends: completion and
stories done over time, done vs in scope per product, what moved in the last week, and a build
progress section in every newsletter.

## Founder dashboard

A private page at `/dashboard` shows activity across all five products and sends a weekly and monthly
emailed briefing. Product numbers are never copied into WonderApps: each product is read live through a read-only
role you create with `docs/dashboard/<product>-readonly.sql`, with its connection string in a Vercel
environment variable. Sign-in is a one-time emailed link for an allow-list of addresses. Setup, security
model and every variable are in [`docs/dashboard/README.md`](docs/dashboard/README.md).

## Investor decks

Each startup's deck is one slide model rendered two ways: the embedded full-screen viewer on `/startups/<slug>#deck` and a printable route (`/decks/<slug>/print`) that becomes the PDF in `public/decks/`. The PDFs are committed, so **after changing any content that feeds a deck, rebuild them**:

```bash
npm run build && npm run decks    # writes public/decks/*.pdf (uses the Playwright Chromium already on the machine)
npm run build                     # so the freshly written PDFs are served
```

## Pages

`/` · `/startups/wonderhome` · `/startups/wonderjobs` · `/startups/wondercreator` · `/startups/wonderark` · `/startups/wonderid` · `/decks` · `/contact` · `/privacy` · `/terms` · `/cookies` · `/disclaimer` · `/accessibility` · `/security`
