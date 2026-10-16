# Testing: what runs where, and why

Pull requests stay fast; the slow browser suite runs every night. Production deploys only from
`main` on Vercel, after the pull request is merged (see CLAUDE.md, Build-slot budget).

| When | Workflow | What runs | Typical time |
|---|---|---|---|
| Every pull request | `.github/workflows/ci.yml` | In parallel: **typecheck** · **lint** (changed files; the whole repo when `package.json`, the lockfile, `tsconfig.json`, `eslint.config.mjs`, `next.config.ts`, `postcss.config.mjs`, `playwright.config.ts`, `vercel.json` or `.github/` change) · **dependency audit** (blocks on high/critical in production dependencies; dev-only findings are reported) · **secret scan** (gitleaks, the commits in the change) | 1–2 min |
| Push to `main` | `ci.yml` | The same jobs with the **whole** lint | 1–2 min |
| Nightly, 03:00 India time | `.github/workflows/e2e-nightly.yml` | Fresh production build of `main`, then the **full end-to-end suite** (Playwright, Chromium, desktop + phone) | ~3 min |
| By hand | `e2e-nightly.yml` (Run workflow) | All specs, or the spec files you list | |

There are no unit tests in this repository yet, so there is no unit-test job; the typecheck and
the end-to-end suite cover the code. When unit tests are added, run the ones related to the
changed files on pull requests (`vitest related`) and all of them on `main` and on config changes.

Vercel builds the site on `main` and fails the deployment if the build breaks; `npm run check`
(lint + typecheck + build) is still the local gate before pushing.

## The end-to-end suite (`e2e/`)

| Spec | Covers |
|---|---|
| `public.spec.ts` | Every page in the sitemap: loads, has a heading, no script errors, no sideways scroll (desktop and phone); each deep dive's live-product link and deck PDF; the old WonderAgent address; the Back button |
| `contact.spec.ts` | The contact form end to end up to sending, server validation (bad email, short message, malformed body), the honeypot |
| `tracker.spec.ts` | `/appstracker` shows five products with non-zero figures; `/api/tracker` parses every product's live tracker |
| `dashboard.spec.ts` | Signed out: every dashboard page goes to sign-in, dashboard and cron endpoints refuse anonymous calls, robots.txt excludes the dashboard. Signed in: overview, development trends, a product's trend and "moved" list |

Tests run against a **local production build** (`next build` + `next start`, started by
`playwright.config.ts`), never against wonderapps.biz. The server they start has:

- no mail password and no recipients, so the contact form can never send email from a test;
- no product database URLs, so the dashboard reads no product's data;
- no cron secret and no progress write key, so nothing can write to the WonderApps database;
- a random dashboard session secret per run and a throwaway allowed address, so the session a
  test mints works only against that server.

The pages read the site's copy and tracker history from the WonderApps database with the
public, read-only key, as visitors do. No spec creates records or changes a shared setting, so
there is nothing for a later run to clean up. If a spec ever needs to create data, name it with an
`e2e-` prefix and delete such records older than two hours in the nightly's "Clean up earlier
runs" step; if it changes a shared setting, reset it in the same step.

### Run it locally

```bash
npm run e2e                                   # every spec, against a fresh local build
npm run e2e -- e2e/contact.spec.ts            # chosen spec files
E2E_SKIP_BUILD=1 npm run e2e -- e2e/dashboard.spec.ts   # reuse the last `npm run build`
npx playwright show-report                    # the HTML report, with traces of failures
```

First time on a machine: `npx playwright install chromium`. Before merging something risky
(dashboard sign-in or sessions, the contact form or mailer, database migrations or the progress
recorder, a new cross-page flow), run the affected specs this way.

### Retries, flakiness and the time budget

- Each test may retry once. A test that passes only on retry is **flaky**: the summary lists it
  and it needs a root cause; flaky is not a cause.
- Each run has a time budget (`E2E_BUDGET_MIN`, default 25 minutes). When it runs out,
  Playwright stops starting tests and the summary lists the rest as **not run**, instead of the
  job being killed. The suite takes about three minutes today, so it runs as one part; if it ever
  approaches 30 minutes, split it into parallel parts with the slowest spec files in parts of
  their own, balanced by the measured times in the JSON report.
- The nightly writes a summary (passed / failed / flaky / not run) to the run page and keeps the
  HTML report and traces as an artifact for 14 days. A failed scheduled run is emailed by GitHub
  to the account that owns the workflow.

### Run the nightly by hand

GitHub → Actions → **E2E nightly** → **Run workflow**, optionally with spec files
(`e2e/contact.spec.ts e2e/tracker.spec.ts`) and a budget. Or:
`gh workflow run e2e-nightly.yml -f specs="e2e/contact.spec.ts"`.

## Rules

- Never skip, disable or delete a test to make CI green.
- A red nightly is fixed before other work merges. Find the root cause; "flaky" is not one.

## Known issues found by the suite

- `/decks` has no level-1 heading (its title is an `h2`). The public-pages check accepts `h1` or
  `h2` until the page is fixed; tighten it back to `h1` with the fix.
