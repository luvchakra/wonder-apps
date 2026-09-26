# WonderApps

Investor portfolio site for **WonderHome**, **WonderJobs**, **WonderArk** and
**WonderID** — four AI-native products built on one shared, security-first
architecture.

Static Next.js site with Apple-style presentation. The only server-side code is
the contact form, which emails submissions through [Resend](https://resend.com).
No database.

## Run it

```bash
npm install
cp .env.example .env.local     # fill in RESEND_API_KEY, CONTACT_RECIPIENTS, CONTACT_FROM
npm run dev                    # http://localhost:3000
npm run check                  # lint + typecheck + production build
```

## Configure

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend API key used server-side only. |
| `CONTACT_RECIPIENTS` | Comma-separated inboxes that receive every contact-form message. |
| `CONTACT_FROM` | Sender address on a Resend-verified domain, e.g. `WonderApps <hello@yourdomain.com>`. |
| `NEXT_PUBLIC_SITE_URL` | Optional canonical URL for metadata and the sitemap. |

Set the same variables in Vercel → Project → Settings → Environment Variables.

## Deploy

The repo is linked to the Vercel project `wonder-apps` (team `luvchakra's projects`, id `prj_eAN93HE8LG4URCWU0JlhBQtokWuM`). Every push
to a branch gets a preview URL; merging to `main` deploys production. `vercel.json`
pins the Next.js framework preset and the `bom1` (Mumbai) function region, matching
the data residency of the products themselves.

## Edit the content

All copy lives in `src/content/`:

- `startups.ts` — one record per product (problem, solution, how it works, market, business model, moat, execution facts, roadmap, ask, screenshots, live + help-centre links).
- `site.ts` — site name, navigation, legal links, jurisdiction, "last updated" date.
- `legal.ts` — Privacy, Terms, Cookies, Investor Disclaimer, Accessibility, Security.

Screenshots live in `public/screenshots/<product>/`; add a file and reference it in the product's `screens` array.

## Pages

`/` · `/startups/wonderhome` · `/startups/wonderjobs` · `/startups/wonderark` · `/startups/wonderid` · `/contact` · `/privacy` · `/terms` · `/cookies` · `/disclaimer` · `/accessibility` · `/security`
