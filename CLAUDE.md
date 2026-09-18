# WonderApps

Investor-facing portfolio site for four AI-native products — **WonderHome**,
**WonderJobs**, **WonderArk** and **WonderAgent**. Apple-style presentation:
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
  site.ts           name, nav, legal links, jurisdiction, lastUpdated
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
  api/contact/route.ts      POST → Resend. Honeypot field, zod validation.
public/screenshots/<slug>/  captures of the deployed products (desktop 1800w,
                            mobile 780w). WonderAgent's come from its own repo.
public/brands/<slug>/       logo lockups shipped by the products themselves
```

## Rules that matter here

- **Never invent traction.** Every number on the site traces to a product's
  public engineering tracker or live site. If you cannot cite it, don't add it.
- Help-centre links (`helpUrl`) currently redirect to sign-in for three of the
  four products; the founder will make them public. Keep the links.
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
