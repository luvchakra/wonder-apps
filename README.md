# WonderApps

Investor portfolio site for five independent AI-native startups: **WonderHome**,
**WonderJobs**, **Wonder Creator**, **WonderArk** and **WonderID**. Each has its
own deep-dive page, cited market figures and a downloadable investor deck.

Static Next.js site with Apple-style presentation. The only server-side code is
the contact form, which emails submissions through the WonderApps mailbox
(GoDaddy Workspace Email over SMTP).
No database.

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

The repo is linked to the Vercel project `wonder-apps` (team `luvchakra's projects`, id `prj_eAN93HE8LG4URCWU0JlhBQtokWuM`). Only
`main` deploys: `vercel.json` → `git.deploymentEnabled` turns off the working-branch
prefixes (`claude/**`, `ccr-**`, `feature/**`, `dependabot/**`), so no previews spend
build slots (see the build-slot budget in `CLAUDE.md`). `vercel.json` also pins the
Next.js framework preset, the `bom1` (Mumbai) function region, matching the data
residency of the products themselves, and the two newsletter crons.

### Vercel checklist (done in the dashboard, not in this repo)

Production environment variables (Settings → Environment Variables):

| Needed for | Variables |
|---|---|
| Contact form | `SMTP_PASS`, `CONTACT_RECIPIENTS` (`CONTACT_FROM` optional) |
| Dashboard sign-in | `DASHBOARD_ALLOWED_EMAILS`, `DASHBOARD_SESSION_SECRET` (32+ chars) |
| Dashboard data | `WONDERHOME_DATABASE_URL` … `WONDERID_DATABASE_URL` (read-only roles, see `docs/dashboard/README.md`) |
| Newsletters | `CRON_SECRET` (16+ chars), `NEWSLETTER_CADENCE`, optional `NEWSLETTER_RECIPIENTS` |
| Metadata | `NEXT_PUBLIC_SITE_URL=https://wonderapps.biz` |

Domains: `wonderapps.biz` as the production domain (and `www.wonderapps.biz`
redirecting to it). Never set `DASHBOARD_DEMO` in production (it is ignored there anyway).
Changing variables takes effect on the next production deployment, which follows the
build-slot rules in `CLAUDE.md`.

## Edit the content

All copy lives in `src/content/`:

- `startups.ts` — one record per product (problem, solution, how it works, market, business model, moat, execution facts, roadmap, ask, screenshots, live + help-centre links).
- `deck-copy.ts` / `decks.ts` — the investor decks. Slides are derived from `startups.ts` (market figures, traction, plans, roadmap) plus the short copy in `deck-copy.ts`.
- `site.ts` — site name, navigation, legal links, jurisdiction, "last updated" date.
- `legal.ts` — Privacy, Terms, Cookies, Investor Disclaimer, Accessibility, Security.

Screenshots live in `public/screenshots/<product>/`; add a file and reference it in the product's `screens` array.

## Founder dashboard

A private page at `/dashboard` shows activity across all five products and sends a weekly and monthly
emailed briefing. WonderApps has no database of its own: each product is read live through a read-only
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
