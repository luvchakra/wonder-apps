# Founder dashboard

One private page at `/dashboard` that shows activity across all five products, plus a weekly
and monthly emailed briefing. **WonderApps has no database of its own, at any stage.** Every
number is read live from the product that owns it, through a read-only connection you control.

```
/dashboard                 portfolio pulse: totals, signups by product, "needs you", product cards
/dashboard/<product>       one product: headline KPIs, trends, funnel, retention, revenue, AI, health
/dashboard/newsletter      preview any period, send a test, send to the list, see the schedule
```

## How the numbers get here

1. Each product keeps its data in its own Postgres (Supabase). You create a role there,
   `wonderapps_dashboard`, with `docs/dashboard/<product>-readonly.sql`. The role can only
   `SELECT`, only the columns the metrics need (never emails, names or content), and every
   session is read-only with an 8-second statement limit.
2. You put that role's **pooled** connection string in Vercel as `<PRODUCT>_DATABASE_URL`.
3. The dashboard runs the fixed queries in `src/lib/dashboard/apps/<product>.ts`. They take
   only a date window and a time zone, return **aggregates**, and never reach the browser as
   rows. Results are cached for two minutes in memory (nothing is stored).

A product whose variable is unset shows "Not connected"; one that can't be reached shows
"Unreachable"; a single failing metric is listed without breaking the page.

## Setup (once per product)

1. Open the product's database SQL editor and run `docs/dashboard/<product>-readonly.sql`
   after replacing `<<set-a-long-random-password>>`.
2. Copy the **connection pooler** URL for user `wonderapps_dashboard` (Supabase: Project
   Settings → Database → Connection pooling; the user is `wonderapps_dashboard.<project-ref>`).
3. Vercel → WonderApps → Settings → Environment Variables: add `<PRODUCT>_DATABASE_URL`.
   | Product | Variable |
   |---|---|
   | WonderHome | `WONDERHOME_DATABASE_URL` |
   | WonderJobs | `WONDERJOBS_DATABASE_URL` |
   | Wonder Creator | `WONDERCREATOR_DATABASE_URL` |
   | WonderArk | `WONDERARK_DATABASE_URL` |
   | WonderID | `WONDERID_DATABASE_URL` |
4. Redeploy. Open `/dashboard/<product>`; it should say **Live**.

If new tables are added to a product later, add them to its SQL file, re-run it, and add a
metric. Metrics that read a table the role can't see show as "couldn't be read".

### Product-specific notes

- **WonderJobs** keeps almost everything in one JSON document per account, which holds career
  profiles and drafts, so its role is *not* granted that table. `wonderjobs-readonly.sql` instead
  creates a private schema `wonderapps_dashboard` of views that emit only ids, timestamps, enum labels
  and numbers. **Run that script as `postgres` (the table owner)**; it checks. Test or demo accounts
  can be excluded by inserting their ids into `wonderapps_dashboard.excluded_accounts` (the script shows how).
  The JobsLake metrics need that product's migration 0007 applied; until then two metrics show as unavailable.
- **WonderArk and WonderID** need nothing special beyond the script.
- **No billing data exists yet** for WonderJobs and Wonder Creator (free today), so they show no revenue; WonderHome,
  WonderArk and WonderID derive MRR/ARR only from real subscription amounts.
- Metrics that need data a product doesn't store (AI cost on WonderHome, region on WonderID, and so on) were left out
  rather than guessed. Each module header states what it assumes.

## Access

Sign-in is a **one-time emailed link**, with no passwords.

| Variable | What it does |
|---|---|
| `DASHBOARD_ALLOWED_EMAILS` | The only addresses that can sign in. Remove one and its sessions stop working on the next request. |
| `DASHBOARD_SESSION_SECRET` | 32+ random characters (`openssl rand -base64 48`). Signs sessions and links. Rotate it to sign everyone out. |
| `DASHBOARD_SESSION_VERSION` | Optional. Change it to sign everyone out without rotating the secret. |
| `SMTP_PASS` (and optional `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`) | The WonderApps mailbox the contact form uses; also sends the sign-in links and newsletters. |

What protects it:

- **Allow-list, checked on every request**, not only at sign-in.
- **Links are bound to the browser that asked.** The link carries a hash of a random value
  stored in an HttpOnly cookie in that browser, so a forwarded or intercepted link is useless
  elsewhere. Links last 10 minutes.
- **The same answer for everyone.** Asking for a link never reveals whether an address is
  allowed (same response, same timing, same cookie).
- **Sessions are 12 hours**, signed (HMAC-SHA256, key derived per purpose so a link can never
  be replayed as a session), HttpOnly, Secure, SameSite=Lax, `__Host-` prefixed in production.
- **Two gates.** `src/proxy.ts` redirects unauthenticated requests, and every page and API
  route checks the session again, so bypassing one still exposes nothing.
- **State-changing requests** (send, sign out) require a same-origin `Origin` header.
- **No indexing or caching.** `noindex`, `Cache-Control: no-store`, `X-Frame-Options: DENY`,
  `Referrer-Policy: no-referrer`, and `/dashboard` is disallowed in `robots.txt` and not linked
  from the public site.
- **Least-privilege data access**: a read-only role limited to named columns, read-only
  transactions, statement timeout, `SELECT`-only queries enforced in code, no user input in SQL,
  labels that look like email addresses are blanked before display.

Rate limits on sign-in are per serverless instance (a speed bump); the boundary is the signed,
browser-bound, short-lived link plus the allow-list.

## Newsletters

| Variable | What it does |
|---|---|
| `NEWSLETTER_RECIPIENTS` | Comma-separated recipients; defaults to `DASHBOARD_ALLOWED_EMAILS`. |
| `NEWSLETTER_CADENCE` | `weekly` (default), `monthly`, `both` or `off`. |
| `NEWSLETTER_FROM` | Optional sender; defaults to `CONTACT_FROM`. |
| `CRON_SECRET` | 16+ random characters. Vercel Cron sends it as a Bearer token; without it automatic sends refuse to run. |

`vercel.json` schedules two crons (UTC): weekly **Mondays 03:30 (09:00 IST)** and monthly on the
**1st at 03:45 (09:15 IST)**. Weekly covers the last seven complete days; monthly the previous
calendar month; both compare with the period before. A retried cron can't double-send (idempotency
key per period). Vercel Hobby allows these because they run at most daily.

The email is drafted from live numbers: portfolio totals, auto-written highlights (the biggest
real movements, then anything that needs a look), and one block per product with its headline
KPIs, deltas and a daily signups bar chart. From `/dashboard/newsletter` you can preview any
period, download the HTML, send yourself a test, or send to the list now.

## Adding or changing a metric

Edit `src/lib/dashboard/apps/<product>.ts` (contract in `src/lib/dashboard/types.ts`), add the
table or columns to `docs/dashboard/<product>-readonly.sql`, and keep every query aggregate-only,
bound to `$1..$4`, and schema-qualified. Locally, `DASHBOARD_DEMO=1` renders synthetic numbers
(never in production) so layouts can be reviewed with no databases.
