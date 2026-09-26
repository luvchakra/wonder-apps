# WonderApps

Investor-facing portfolio site for four AI-native products — **WonderHome**,
**WonderJobs**, **WonderArk** and **WonderID** (formerly WonderAgent). Apple-style presentation:
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
  startups.ts       one typed record per product: problem, solution, market,
                    model, moat, traction, roadmap, screens, links (incl. helpUrl)
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
  (legal)/[slug]/page.tsx   legal pages, statically generated from legal.ts
  contact/page.tsx          contact page (?interest=<slug> preselects a product)
  appstracker/page.tsx      portfolio engineering tracker (TrackerClient)
  api/contact/route.ts      POST → Resend. Honeypot field, zod validation.
  api/tracker/route.ts      GET → reads the four products' tracker markdown
                            from raw.githubusercontent.com and returns parsed rows
src/lib/tracker-parsers.ts  deterministic markdown-table parsers, one per product;
                            a parser THROWS when its table isn't found so the client
                            keeps the last good data instead of showing wrong numbers
src/content/progress.ts     the curated snapshot the tracker renders before (and if)
                            the live fetch succeeds; editorial notes per row live here
docs/progress.md            GENERATED story-by-story progress across all four
                            products — regenerate with `npm run progress` (fetches
                            GitHub; `-- --local <dir>` reads local clones instead)
scripts/build-progress-doc.mjs  the generator
public/screenshots/<slug>/  captures of the deployed products (desktop 1800w,
                            mobile 780w). WonderID's are public-page captures
                            (landing, sign-in) — never create an account on a
                            product's production to capture signed-in screens.
public/brands/<slug>/       logo lockups shipped by the products themselves
```

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
  `wonder-agent`, domain `agent.wonderapps.biz` unchanged). Slug is `wonderid`;
  `/startups/wonderagent` redirects permanently (next.config.ts) and the contact
  page maps `?interest=wonderagent`. Say "formerly WonderAgent" once per page at
  most, not everywhere.
- Completion percentages are floored, never rounded up: 223 of 224 is 99%.
- Help-centre links (`helpUrl`): WonderJobs, WonderArk and WonderID are
  public; WonderHome still redirects to sign-in (checked 2026-09-19). Keep
  the link regardless — the founder is making it public.
- Each product's `url`/`helpUrl` point to its custom domain (`home.`, `jobs.`,
  `ark.`, `agent.` — all `.wonderapps.biz`), the products' intended addresses.
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
