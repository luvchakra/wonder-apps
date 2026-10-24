# Architecture: where things live

Read this when you need a file map. The rules themselves are in `CLAUDE.md`.

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
scripts/ui-check.mjs        prints matched elements' text and boxes; optional JPEG crop
public/screenshots/<slug>/  captures of the deployed products (desktop 1800w,
                            mobile 780w). WonderID's are public-page captures
                            (landing, sign-in) — never create an account on a
                            product's production to capture signed-in screens.
public/brands/<slug>/       logo lockups shipped by the products themselves
```

Dashboard and careers code: see `docs/dashboard/README.md` and the Founder dashboard and
Careers sections of `CLAUDE.md`.
