# WonderApps

Investor-facing portfolio site for five independent AI-native startups —
**WonderHome**, **WonderJobs**, **Wonder Creator**, **WonderArk** and **WonderID**
(formerly WonderAgent). Apple-style presentation:
dark/light bands, scroll-linked parallax, device frames, staged hero animation.
Static except for one route handler that emails contact-form submissions via
Resend. No database.

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

There is no test suite yet; `npm run check` (lint + typecheck + build) is the
pre-push gate.

## Stack

Next.js 16 App Router · React 19 · TypeScript · Tailwind CSS 4 · Framer Motion ·
lucide-react · zod · Resend. System font stack on purpose (no external font
fetch at build time).

## Layout

```
src/content/        ALL copy lives here — edit these, not the components
  startups.ts       one typed record per product: problem, solution, market
                    (incl. sourced `figures`), model, moat, traction, roadmap,
                    screens, links (helpUrl is data only)
  deck-copy.ts      short slide copy per product for the investor decks
  decks.ts          the slide model (`buildDeck`) shared by viewer and PDF
  site.ts           name, nav, legal links, jurisdiction, lastUpdated, canonical
                    url (wonderapps.biz) and contactEmail (connect@wonderapps.biz)
  legal.ts          privacy / terms / cookies / disclaimer / accessibility / security
  types.ts          the Startup type
src/components/     Hero, Showcase (landing chapter per product), StartupSections
                    (deep-dive page), Device (laptop/phone frames), Parallax,
                    Reveal, Stats (count-up), ContactForm, Nav, Footer
src/app/
  page.tsx                  landing
  startups/[slug]/page.tsx  deep dive, statically generated per product
  decks/page.tsx            index of the five decks
  decks/[slug]/print/       printable 1920x1080 slides → source of the PDFs
  (legal)/[slug]/page.tsx   legal pages, statically generated from legal.ts
  contact/page.tsx          contact page (?interest=<slug> preselects a product)
  appstracker/page.tsx      portfolio engineering tracker (TrackerClient)
  api/contact/route.ts      POST → Resend. Honeypot field, zod validation.
  api/tracker/route.ts      GET → reads the five products' tracker markdown
                            from raw.githubusercontent.com and returns parsed rows
src/lib/tracker-parsers.ts  deterministic markdown-table parsers, one per product;
                            a parser THROWS when its table isn't found so the client
                            keeps the last good data instead of showing wrong numbers
src/content/progress.ts     the curated snapshot the tracker renders before (and if)
                            the live fetch succeeds; editorial notes per row live here
docs/progress.md            GENERATED story-by-story progress across all five
                            products — regenerate with `npm run progress` (fetches
                            GitHub; `-- --local <dir>` reads local clones instead)
scripts/build-progress-doc.mjs  the generator
public/screenshots/<slug>/  captures of the deployed products (desktop 1800w,
                            mobile 780w). WonderID's are public-page captures
                            (landing, sign-in) — never create an account on a
                            product's production to capture signed-in screens.
public/brands/<slug>/       logo lockups shipped by the products themselves
```

## Investor decks and market figures

- Each product has a deck: embedded `DeckViewer` (full screen, keyboard, swipe)
  on its page and a committed PDF in `public/decks/`. Slides are drawn at a fixed
  1920x1080 by `DeckSlides.tsx`. After changing anything a deck reads
  (`startups.ts`, `deck-copy.ts`, slide components): `npm run build && npm run
  decks && npm run build` (Next only serves `public/` files that existed at build).
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

## Founder dashboard (/dashboard) — private, dynamic

The one place the site is not static. Full guide: `docs/dashboard/README.md`.

- **No database of our own, ever.** Numbers are read live from each product through a read-only
  Postgres role (`<APP>_DATABASE_URL` env vars; scripts in `docs/dashboard/*-readonly.sql`). Nothing is
  stored in WonderApps except a two-minute in-memory cache.
- **Aggregates only.** Metrics live in `src/lib/dashboard/apps/<slug>.ts` against the contract in
  `src/lib/dashboard/types.ts`: single `SELECT`, only `$1..$4`, no user input in SQL, no emails/names/free
  text (labels that look like emails are blanked). `registry.ts` rejects non-SELECT SQL at build time.
  Adding a metric means adding its table/columns to that product's role script too.
- **Access.** `DASHBOARD_ALLOWED_EMAILS` + emailed one-time link bound to the requesting browser, signed
  12 h sessions (`DASHBOARD_SESSION_SECRET`). `src/proxy.ts` is the first gate and every page/route calls
  `requireSession()`/`getSession()` again. Never link `/dashboard` from the public site.
- **Newsletters** are built from the same live data (`newsletter.ts`), sent with Resend by Vercel Cron
  (`vercel.json`, `CRON_SECRET`) or from `/dashboard/newsletter`. `DASHBOARD_DEMO=1` shows synthetic
  numbers locally and is ignored in production.
- The public-copy rules above (no tech stack names) apply to the marketing site, not to this private page.

## The tracker (/appstracker)

- Renders the snapshot in `src/content/progress.ts` on the server, then fetches
  `/api/tracker` on mount and on the Refresh button. Live rows replace snapshot
  rows per product; a product whose fetch or parse fails keeps its snapshot and
  shows an inline warning. Never let a parse failure produce zeros.
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
- Help-centre links (`helpUrl`): WonderJobs, WonderArk and WonderID are
  public; WonderHome still redirects to sign-in (checked 2026-09-19). Keep
  the link regardless — the founder is making it public.
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

## Environment

See `.env.example`. `RESEND_API_KEY` and `CONTACT_RECIPIENTS` (comma-separated)
are required for the contact form to send; without them the route returns 503
with a clear message and logs the reason. `CONTACT_FROM` must be a verified
Resend sender.

## Session startup

`.claude/hooks/session-start.sh` installs dependencies on Claude Code on the web
by detecting `package.json` (npm here). Nothing else is needed.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
