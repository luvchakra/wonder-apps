import type { AppDashboard } from "../types";

/**
 * WonderJobs founder-dashboard metrics.
 *
 * Every query is fixed SQL (the only composition below is this module-load-time concatenation of
 * constant fragments; no runtime value is ever interpolated), uses only $1..$4, and returns
 * aggregates. The least-privilege database role these queries run as is created by
 * docs/dashboard/wonderjobs-readonly.sql.
 *
 * How the data is read (see that file for the reasoning):
 *  - Almost all WonderJobs product state is one JSON document per account and store in
 *    wonderjobs.app_state. The role has NO privilege on that table. It reads the views in the
 *    private schema `wonderapps_dashboard`, which expose only (opaque account id, timestamp,
 *    allow-listed category, number) rows.
 *  - A few flat tables with no personal data (contact_messages, ai_provider_secrets, jobslake_runs)
 *    are read directly through column-level grants.
 *
 * Shared assumptions (repeated as -- NOTE comments in the SQL):
 *  - An "account" is a Supabase Auth user that has synced at least once (a wonderjobs.tenants row
 *    with a UUID id), minus any tenant listed in wonderapps_dashboard.excluded_accounts.
 *  - The product has no billing and no analytics event store; everything is derived from what the
 *    app persists. The app keeps only recent history in each document (40 runs, 500 AI calls,
 *    20 saved resumes, 300 "not for me" decisions, 25 Apply sessions), so old windows are lower bounds.
 *  - Percent metrics are returned on a 0-100 scale.
 */

/**
 * CTE (without the WITH keyword) naming the four bound parameters with explicit types.
 *
 * The runner always binds all four ($1 window start, $2 window end, $3 previous window start,
 * $4 time zone). Postgres rejects a statement that leaves a bound parameter unreferenced ("bind
 * message supplies 4 parameters, but prepared statement requires N"), so every metric selects from
 * this CTE and reads its parameters as p.w_start, p.w_end, p.p_start and p.tz.
 */
const PARAMS = `p AS (
  -- NOTE: only names and types the four bound parameters; it never filters a row.
  SELECT $1::timestamptz AS w_start, $2::timestamptz AS w_end, $3::timestamptz AS p_start, $4::text AS tz
)`;

/** Distinct active accounts in the trailing N days ending at the window end (value) and at the window start (prev). */
const activeIn = (days: number) => `WITH ${PARAMS}
-- NOTE: "active" is defined by wonderapps_dashboard.activity_events (see activeDefinition).
SELECT count(DISTINCT e.tenant_id) FILTER (WHERE e.at >= p.w_end - interval '${days} days' AND e.at < p.w_end)::numeric AS value,
       count(DISTINCT e.tenant_id) FILTER (WHERE e.at >= p.w_start - interval '${days} days' AND e.at < p.w_start)::numeric AS prev
FROM wonderapps_dashboard.activity_events e, p
WHERE e.at >= p.w_start - interval '${days} days' AND e.at < p.w_end`;

/** Search sources JobsLake runs on behalf of candidates; admin test/playground runs are excluded. */
const SOURCE_TRAFFIC = `r.trigger IN ('search', 'refresh')`;

/** Built-in source ids are shown as they are; admin-added ones can embed an employer slug, so they are bucketed. */
const SOURCE_LABEL = `CASE WHEN r.source_id IN ('greenhouse','lever','ashby','remotive','jobicy','remoteok','himalayas','arbeitnow','adzuna_in') THEN r.source_id
            WHEN r.source_id LIKE 'ats\\_%' THEN 'custom ATS board'
            ELSE 'custom source' END`;

export const wonderjobs: AppDashboard = {
  slug: "wonderjobs",
  envVar: "WONDERJOBS_DATABASE_URL",
  focus:
    "Are new job seekers finishing Career setup, running a first search and preparing an application, and are they back in week two?",
  activeDefinition:
    "An account is active on a day if the person did something themselves that day: first sign-in sync, ran a search, started or updated an application, recorded a “not for me” decision, generated a résumé, or started an Apply with Wonder session. Scheduled (cron) runs, auto-saved jobs and background syncs do not count.",
  metrics: [
    /* ------------------------------------------------------------ audience */
    {
      kind: "stat", id: "total-accounts", section: "audience", label: "Total accounts", format: "int", snapshot: true, headline: true,
      hint: "Signed-in accounts created before the window end (own and excluded test accounts left out).",
      sql: `WITH ${PARAMS}
-- NOTE: an account is a Supabase Auth user who has synced at least once; legacy cookie-only visitors are ignored.
SELECT count(*)::numeric AS value
FROM wonderapps_dashboard.accounts a, p
WHERE a.created_at < p.w_end`,
    },
    {
      kind: "stat", id: "new-accounts", section: "audience", label: "New accounts", format: "int", headline: true,
      hint: "Accounts created in the window (the account row appears at the first sync after sign-up).",
      sql: `WITH ${PARAMS}
SELECT count(*) FILTER (WHERE a.created_at >= p.w_start AND a.created_at < p.w_end)::numeric AS value,
       count(*) FILTER (WHERE a.created_at >= p.p_start AND a.created_at < p.w_start)::numeric AS prev
FROM wonderapps_dashboard.accounts a, p`,
    },
    {
      kind: "stat", id: "dau", section: "audience", label: "Daily active accounts", format: "int", snapshot: true,
      hint: "Distinct accounts that did something themselves in the 24 hours before the window end.",
      sql: activeIn(1),
    },
    {
      kind: "stat", id: "wau", section: "audience", label: "Weekly active accounts", format: "int", snapshot: true, headline: true,
      hint: "Distinct accounts that did something themselves in the 7 days before the window end.",
      sql: activeIn(7),
    },
    {
      kind: "stat", id: "mau", section: "audience", label: "Monthly active accounts", format: "int", snapshot: true,
      hint: "Distinct accounts that did something themselves in the 30 days before the window end.",
      sql: activeIn(30),
    },
    {
      kind: "stat", id: "stickiness", section: "audience", label: "Stickiness (DAU / MAU)", format: "pct", snapshot: true,
      hint: "Daily active accounts as a percentage of monthly active accounts at the window end (0-100).",
      sql: `WITH ${PARAMS}, s AS (
  SELECT count(DISTINCT e.tenant_id) FILTER (WHERE e.at >= p.w_end - interval '1 day' AND e.at < p.w_end) AS dau,
         count(DISTINCT e.tenant_id) FILTER (WHERE e.at >= p.w_end - interval '30 days' AND e.at < p.w_end) AS mau,
         count(DISTINCT e.tenant_id) FILTER (WHERE e.at >= p.w_start - interval '1 day' AND e.at < p.w_start) AS dau_prev,
         count(DISTINCT e.tenant_id) FILTER (WHERE e.at >= p.w_start - interval '30 days' AND e.at < p.w_start) AS mau_prev
  FROM wonderapps_dashboard.activity_events e, p
  WHERE e.at >= p.w_start - interval '30 days' AND e.at < p.w_end
)
SELECT round(100.0 * dau / NULLIF(mau, 0), 1)::numeric AS value,
       round(100.0 * dau_prev / NULLIF(mau_prev, 0), 1)::numeric AS prev
FROM s`,
    },
    {
      kind: "series", id: "signups-per-day", section: "audience", label: "New accounts per day", format: "int", style: "bars",
      sql: `WITH ${PARAMS}
SELECT date_trunc('day', a.created_at AT TIME ZONE p.tz)::date AS day, count(*)::numeric AS value
FROM wonderapps_dashboard.accounts a, p
WHERE a.created_at >= p.w_start AND a.created_at < p.w_end
GROUP BY 1 ORDER BY 1`,
    },
    {
      kind: "funnel", id: "activation-funnel", section: "audience", label: "Activation funnel (accounts created in the window)",
      hint: "Each step needs all earlier steps. Accounts younger than 14 days cannot have reached the last step yet.",
      sql: `WITH ${PARAMS},
cohort AS (
  SELECT a.tenant_id, a.created_at
  FROM wonderapps_dashboard.accounts a, p
  WHERE a.created_at >= p.w_start AND a.created_at < p.w_end
),
flags AS (
  SELECT c.tenant_id,
         COALESCE(cf.onboarded, false) AS did_setup,
         -- NOTE: "first search" = at least one search the person ran themselves (scheduled runs do not count).
         EXISTS (SELECT 1 FROM wonderapps_dashboard.run_facts r WHERE r.tenant_id = c.tenant_id AND r.trigger = 'manual') AS did_search,
         -- NOTE: "application started" = an application moved past 'saved' or has a drafted resume, cover letter or answers.
         EXISTS (SELECT 1 FROM wonderapps_dashboard.application_facts f
                  WHERE f.tenant_id = c.tenant_id
                    AND (f.status <> 'saved' OR f.has_resume OR f.has_cover_letter OR f.has_answers)) AS did_application,
         -- NOTE: "returned in week 2" = any self-initiated activity 7 to 14 days after the account was created.
         EXISTS (SELECT 1 FROM wonderapps_dashboard.activity_events e
                  WHERE e.tenant_id = c.tenant_id AND e.kind <> 'joined'
                    AND e.at >= c.created_at + interval '7 days' AND e.at < c.created_at + interval '14 days') AS did_return
  FROM cohort c
  LEFT JOIN wonderapps_dashboard.career_facts cf ON cf.tenant_id = c.tenant_id
),
steps AS (
  SELECT tenant_id,
         did_setup AS s2,
         did_setup AND did_search AS s3,
         did_setup AND did_search AND did_application AS s4,
         did_setup AND did_search AND did_application AND did_return AS s5
  FROM flags
)
SELECT 1 AS step, 'Signed up' AS label, count(*)::numeric AS value FROM steps
UNION ALL SELECT 2, 'Finished Career setup', count(*) FILTER (WHERE s2)::numeric FROM steps
UNION ALL SELECT 3, 'Ran a first search', count(*) FILTER (WHERE s3)::numeric FROM steps
UNION ALL SELECT 4, 'Started an application', count(*) FILTER (WHERE s4)::numeric FROM steps
UNION ALL SELECT 5, 'Back in week two', count(*) FILTER (WHERE s5)::numeric FROM steps
ORDER BY step`,
    },
    {
      kind: "cohort", id: "weekly-retention", section: "audience", label: "Weekly retention by sign-up week",
      hint: "Share of each sign-up week (Monday start) that was active in each later week. Last 8 weeks before the window end.",
      sql: `WITH ${PARAMS},
b AS (
  SELECT date_trunc('week', (p.w_end - interval '1 second') AT TIME ZONE p.tz)::date AS cur_week, p.tz FROM p
),
members AS (
  SELECT a.tenant_id, date_trunc('week', a.created_at AT TIME ZONE b.tz)::date AS cohort, b.cur_week
  FROM wonderapps_dashboard.accounts a, b
  WHERE date_trunc('week', a.created_at AT TIME ZONE b.tz)::date BETWEEN b.cur_week - 49 AND b.cur_week
),
sizes AS (
  SELECT cohort, cur_week, count(*) AS size FROM members GROUP BY cohort, cur_week
),
hits AS (
  -- NOTE: the sign-up itself counts as activity in week 0, so week 0 is 100% by construction.
  SELECT m.cohort, (date_trunc('week', e.at AT TIME ZONE b.tz)::date - m.cohort) / 7 AS week, count(DISTINCT m.tenant_id) AS active
  FROM members m
  JOIN wonderapps_dashboard.activity_events e ON e.tenant_id = m.tenant_id
  CROSS JOIN b
  WHERE date_trunc('week', e.at AT TIME ZONE b.tz)::date >= m.cohort
  GROUP BY 1, 2
)
SELECT s.cohort, w.week::int AS week, COALESCE(h.active, 0)::int AS active, s.size::int AS size
FROM sizes s
CROSS JOIN LATERAL generate_series(0, (s.cur_week - s.cohort) / 7) AS w(week)
LEFT JOIN hits h ON h.cohort = s.cohort AND h.week = w.week
ORDER BY 1, 2`,
    },

    /* ---------------------------------------------------------- engagement */
    {
      kind: "stat", id: "searching-accounts", section: "engagement", label: "Accounts that ran a search", format: "int", headline: true,
      hint: "Distinct accounts that started a job search themselves in the window.",
      sql: `WITH ${PARAMS}
-- NOTE: WonderJobs keeps only the latest 40 runs per account, so a busy account's older runs may be gone.
SELECT count(DISTINCT r.tenant_id) FILTER (WHERE r.created_at >= p.w_start AND r.created_at < p.w_end)::numeric AS value,
       count(DISTINCT r.tenant_id) FILTER (WHERE r.created_at >= p.p_start AND r.created_at < p.w_start)::numeric AS prev
FROM wonderapps_dashboard.run_facts r, p
WHERE r.trigger = 'manual'`,
    },
    {
      kind: "series", id: "searches-per-day", section: "engagement", label: "Searches per day", format: "int", stacked: true, style: "bars",
      hint: "Job-search runs started per day, split between runs the person started and scheduled runs.",
      sql: `WITH ${PARAMS}
SELECT date_trunc('day', r.created_at AT TIME ZONE p.tz)::date AS day,
       count(*)::numeric AS value,
       CASE r.trigger WHEN 'manual' THEN 'Started by the person' ELSE 'Scheduled' END AS series
FROM wonderapps_dashboard.run_facts r, p
WHERE r.created_at >= p.w_start AND r.created_at < p.w_end AND r.trigger IS NOT NULL
GROUP BY 1, 3 ORDER BY 1, 3`,
    },
    {
      kind: "series", id: "applications-per-day", section: "engagement", label: "Applications started per day", format: "int", style: "bars",
      hint: "Applications added to a pipeline per day (saved, prepared or imported from a search).",
      sql: `WITH ${PARAMS}
SELECT date_trunc('day', f.created_at AT TIME ZONE p.tz)::date AS day, count(*)::numeric AS value
FROM wonderapps_dashboard.application_facts f, p
WHERE f.created_at >= p.w_start AND f.created_at < p.w_end
GROUP BY 1 ORDER BY 1`,
    },
    {
      kind: "series", id: "daily-active", section: "engagement", label: "Daily active accounts", format: "int", style: "area",
      hint: "Distinct accounts per day that did something themselves (see how “active” is defined).",
      sql: `WITH ${PARAMS}
SELECT date_trunc('day', e.at AT TIME ZONE p.tz)::date AS day, count(DISTINCT e.tenant_id)::numeric AS value
FROM wonderapps_dashboard.activity_events e, p
WHERE e.at >= p.w_start AND e.at < p.w_end
GROUP BY 1 ORDER BY 1`,
    },
    {
      kind: "stat", id: "jobs-rejected", section: "engagement", label: "“Not for me” decisions", format: "int", good: "neutral",
      hint: "Jobs candidates marked not for me in the window; these train the match ranking.",
      sql: `WITH ${PARAMS}
SELECT count(*) FILTER (WHERE j.at >= p.w_start AND j.at < p.w_end)::numeric AS value,
       count(*) FILTER (WHERE j.at >= p.p_start AND j.at < p.w_start)::numeric AS prev
FROM wonderapps_dashboard.rejection_facts j, p`,
    },
    {
      kind: "breakdown", id: "rejection-reasons", section: "engagement", label: "Why candidates say “not for me”", format: "int",
      hint: "Reasons picked from the fixed list in the window; “None” means no reason was given.",
      sql: `WITH ${PARAMS}
SELECT upper(substr(replace(j.reason, '_', ' '), 1, 1)) || substr(replace(j.reason, '_', ' '), 2) AS label, count(*)::numeric AS value
FROM wonderapps_dashboard.rejection_facts j, p
WHERE j.at >= p.w_start AND j.at < p.w_end
GROUP BY j.reason ORDER BY 2 DESC LIMIT 12`,
    },

    /* ------------------------------------------------------------- product */
    {
      kind: "stat", id: "opportunities-surfaced", section: "product", label: "Opportunities surfaced", format: "int",
      hint: "Unique jobs kept after de-duplication across all searches started in the window (manual and scheduled).",
      sql: `WITH ${PARAMS}
-- NOTE: summed from each retained run's own summary; the product keeps only the latest 40 runs per account.
SELECT COALESCE(sum(r.jobs_retained) FILTER (WHERE r.created_at >= p.w_start AND r.created_at < p.w_end), 0)::numeric AS value,
       COALESCE(sum(r.jobs_retained) FILTER (WHERE r.created_at >= p.p_start AND r.created_at < p.w_start), 0)::numeric AS prev
FROM wonderapps_dashboard.run_facts r, p`,
    },
    {
      kind: "stat", id: "strong-matches", section: "product", label: "Strong matches found", format: "int",
      hint: "Jobs rated a strong fit across all searches started in the window.",
      sql: `WITH ${PARAMS}
SELECT COALESCE(sum(r.strong_matches) FILTER (WHERE r.created_at >= p.w_start AND r.created_at < p.w_end), 0)::numeric AS value,
       COALESCE(sum(r.strong_matches) FILTER (WHERE r.created_at >= p.p_start AND r.created_at < p.w_start), 0)::numeric AS prev
FROM wonderapps_dashboard.run_facts r, p`,
    },
    {
      kind: "breakdown", id: "applications-pipeline", section: "product", label: "Applications by stage (all accounts, now)", format: "int",
      hint: "Every tracked application by its current stage, for applications created before the window end.",
      sql: `WITH ${PARAMS}
SELECT upper(substr(replace(f.status, '_', ' '), 1, 1)) || substr(replace(f.status, '_', ' '), 2) AS label, count(*)::numeric AS value
FROM wonderapps_dashboard.application_facts f, p
WHERE f.created_at < p.w_end
GROUP BY f.status ORDER BY 2 DESC LIMIT 12`,
    },
    {
      kind: "stat", id: "applications-submitted", section: "product", label: "Applications submitted", format: "int", headline: true,
      hint: "Applications the candidate confirmed they submitted on the employer's site, in the window. Wonder never submits for them.",
      sql: `WITH ${PARAMS}
-- NOTE: applied_at is set only when the candidate marks an application submitted.
SELECT count(*) FILTER (WHERE f.applied_at >= p.w_start AND f.applied_at < p.w_end)::numeric AS value,
       count(*) FILTER (WHERE f.applied_at >= p.p_start AND f.applied_at < p.w_start)::numeric AS prev
FROM wonderapps_dashboard.application_facts f, p`,
    },
    {
      kind: "stat", id: "applications-prepared", section: "product", label: "Applications with prepared materials", format: "int",
      hint: "Applications created in the window that have a drafted résumé, cover letter or screening answers.",
      sql: `WITH ${PARAMS}
-- NOTE: counted by the application's creation date; drafts carry no per-day record here.
SELECT count(*) FILTER (WHERE f.created_at >= p.w_start AND f.created_at < p.w_end AND (f.has_resume OR f.has_cover_letter OR f.has_answers))::numeric AS value,
       count(*) FILTER (WHERE f.created_at >= p.p_start AND f.created_at < p.w_start AND (f.has_resume OR f.has_cover_letter OR f.has_answers))::numeric AS prev
FROM wonderapps_dashboard.application_facts f, p`,
    },
    {
      kind: "breakdown", id: "resume-templates", section: "product", label: "Résumé Studio: templates used", format: "int",
      hint: "Résumés generated in the window, by template family (all versions of a template count together).",
      sql: `WITH ${PARAMS}
-- NOTE: WonderJobs keeps the latest 20 saved résumés per account.
SELECT replace(s.template, '-', ' ') AS label, count(*)::numeric AS value
FROM wonderapps_dashboard.resume_facts s, p
WHERE s.created_at >= p.w_start AND s.created_at < p.w_end AND s.template IS NOT NULL
GROUP BY s.template ORDER BY 2 DESC LIMIT 12`,
    },
    {
      kind: "stat", id: "apply-sessions", section: "product", label: "Apply with Wonder sessions", format: "int",
      hint: "Sessions where Wonder began filling an employer form in the candidate's own browser, started in the window.",
      sql: `WITH ${PARAMS}
-- NOTE: WonderJobs keeps the latest 25 sessions per account.
SELECT count(*) FILTER (WHERE x.started_at >= p.w_start AND x.started_at < p.w_end)::numeric AS value,
       count(*) FILTER (WHERE x.started_at >= p.p_start AND x.started_at < p.w_start)::numeric AS prev
FROM wonderapps_dashboard.apply_session_facts x, p`,
    },
    {
      kind: "breakdown", id: "apply-ats", section: "product", label: "Apply with Wonder: employer systems", format: "int",
      hint: "Sessions started in the window by the hiring system of the employer form (“Other” = not a known system).",
      sql: `WITH ${PARAMS}
SELECT upper(substr(x.ats, 1, 1)) || substr(x.ats, 2) AS label, count(*)::numeric AS value
FROM wonderapps_dashboard.apply_session_facts x, p
WHERE x.started_at >= p.w_start AND x.started_at < p.w_end
GROUP BY x.ats ORDER BY 2 DESC LIMIT 12`,
    },
    {
      kind: "stat", id: "helper-accounts", section: "product", label: "Accounts using the browser helper", format: "int",
      hint: "Distinct accounts whose Apply with Wonder session connected the Wonder browser extension in the window.",
      sql: `WITH ${PARAMS}
SELECT count(DISTINCT x.tenant_id) FILTER (WHERE x.helper_connected AND x.started_at >= p.w_start AND x.started_at < p.w_end)::numeric AS value,
       count(DISTINCT x.tenant_id) FILTER (WHERE x.helper_connected AND x.started_at >= p.p_start AND x.started_at < p.w_start)::numeric AS prev
FROM wonderapps_dashboard.apply_session_facts x, p`,
    },
    {
      kind: "stat", id: "schedules-enabled", section: "product", label: "Accounts with a scheduled search on", format: "int", snapshot: true,
      hint: "Distinct accounts that currently have at least one enabled recurring search schedule.",
      sql: `WITH ${PARAMS}
-- NOTE: a point-in-time count of today's schedules; schedules are not versioned, so it cannot be recomputed for a past window end.
SELECT count(DISTINCT s.tenant_id)::numeric AS value
FROM wonderapps_dashboard.schedule_facts s, p
WHERE s.enabled AND s.trigger = 'schedule'`,
    },

    /* ------------------------------------------------------------- revenue */
    {
      kind: "breakdown", id: "plan-mix", section: "revenue", label: "Plan mix (accounts)", format: "int",
      hint: "Accounts by plan flag. WonderJobs has no billing yet, so every account is on the free plan.",
      sql: `WITH ${PARAMS}
-- NOTE: no price, subscription or payment data exists in the schema, so there is no MRR/ARR. The plan flag is never set to 'pro' by the app today.
SELECT CASE c.plan WHEN 'pro' THEN 'Pro' ELSE 'Free' END AS label, count(*)::numeric AS value
FROM wonderapps_dashboard.career_facts c, p
GROUP BY c.plan ORDER BY 2 DESC LIMIT 12`,
    },

    /* ------------------------------------------------------------------ ai */
    {
      kind: "series", id: "ai-calls-per-day", section: "ai", label: "AI calls per day", format: "int", stacked: true, style: "bars",
      hint: "AI requests recorded in the window, split between WonderJobs AI and the candidate's own provider key.",
      sql: `WITH ${PARAMS}
-- NOTE: calls are recorded by the browser (latest 500 per account); failed calls are not recorded.
SELECT date_trunc('day', u.at AT TIME ZONE p.tz)::date AS day,
       count(*)::numeric AS value,
       CASE u.provider WHEN 'wonderjobs' THEN 'WonderJobs AI' WHEN 'anthropic' THEN 'Anthropic key' WHEN 'openai' THEN 'OpenAI key' WHEN 'gemini' THEN 'Gemini key' ELSE 'Other' END AS series
FROM wonderapps_dashboard.ai_usage_facts u, p
WHERE u.at >= p.w_start AND u.at < p.w_end
GROUP BY 1, 3 ORDER BY 1, 3`,
    },
    {
      kind: "stat", id: "ai-tokens", section: "ai", label: "AI tokens used", format: "int",
      hint: "Input plus output tokens of AI calls recorded in the window.",
      sql: `WITH ${PARAMS}
SELECT COALESCE(sum(COALESCE(u.input_tokens, 0) + COALESCE(u.output_tokens, 0)) FILTER (WHERE u.at >= p.w_start AND u.at < p.w_end), 0)::numeric AS value,
       COALESCE(sum(COALESCE(u.input_tokens, 0) + COALESCE(u.output_tokens, 0)) FILTER (WHERE u.at >= p.p_start AND u.at < p.w_start), 0)::numeric AS prev
FROM wonderapps_dashboard.ai_usage_facts u, p`,
    },
    {
      kind: "stat", id: "ai-cost", section: "ai", label: "AI spend on candidates' own keys (USD)", format: "usd", good: "neutral",
      hint: "Estimated cost of calls made with a candidate's own provider key. WonderJobs AI calls record no cost, so Wonder's own AI bill is not in this number.",
      sql: `WITH ${PARAMS}
-- NOTE: cost_usd is null for platform-billed calls; this is NOT the founder's AI bill.
SELECT COALESCE(sum(u.cost_usd) FILTER (WHERE u.at >= p.w_start AND u.at < p.w_end), 0)::numeric AS value,
       COALESCE(sum(u.cost_usd) FILTER (WHERE u.at >= p.p_start AND u.at < p.w_start), 0)::numeric AS prev
FROM wonderapps_dashboard.ai_usage_facts u, p`,
    },
    {
      kind: "stat", id: "byok-adoption", section: "ai", label: "Accounts using their own AI key", format: "pct", snapshot: true,
      hint: "Share of accounts that have connected a provider key (Anthropic, OpenAI or Gemini).",
      sql: `WITH ${PARAMS}
-- NOTE: counts accounts with a stored key; the key itself and its status text are never read.
SELECT round(100.0 * count(*) FILTER (WHERE EXISTS (SELECT 1 FROM wonderjobs.ai_provider_secrets k WHERE k.tenant_id = a.tenant_id))
       / NULLIF(count(*), 0), 1)::numeric AS value
FROM wonderapps_dashboard.accounts a, p
WHERE a.created_at < p.w_end`,
    },

    /* -------------------------------------------------------------- health */
    {
      kind: "stat", id: "run-failure-rate", section: "health", label: "Search runs that failed", format: "pct", good: "down", headline: true,
      hint: "Failed runs as a percentage of finished runs (completed, completed with warnings, failed or stopped) started in the window.",
      sql: `WITH ${PARAMS}
-- NOTE: includes scheduled runs. A run stopped by the server for running out of time is 'STOPPED', not 'FAILED', and counts in the denominator only.
SELECT round(100.0 * count(*) FILTER (WHERE r.status = 'FAILED' AND r.created_at >= p.w_start AND r.created_at < p.w_end)
       / NULLIF(count(*) FILTER (WHERE r.status IN ('COMPLETED','COMPLETED_WITH_WARNINGS','FAILED','STOPPED') AND r.created_at >= p.w_start AND r.created_at < p.w_end), 0), 1)::numeric AS value,
       round(100.0 * count(*) FILTER (WHERE r.status = 'FAILED' AND r.created_at >= p.p_start AND r.created_at < p.w_start)
       / NULLIF(count(*) FILTER (WHERE r.status IN ('COMPLETED','COMPLETED_WITH_WARNINGS','FAILED','STOPPED') AND r.created_at >= p.p_start AND r.created_at < p.w_start), 0), 1)::numeric AS prev
FROM wonderapps_dashboard.run_facts r, p`,
    },
    {
      kind: "stat", id: "source-success-rate", section: "health", label: "Job-source calls that succeeded", format: "pct", good: "up",
      hint: "Of calls to job sources in the window that reached the source, the share that returned a valid answer (an empty answer counts as success).",
      sql: `WITH ${PARAMS}, s AS (
  -- NOTE: needs migration 0007 (JobsLake). Calls that were skipped or need setup are not counted; admin test and playground calls are excluded.
  SELECT count(*) FILTER (WHERE r.started_at >= p.w_start AND r.started_at < p.w_end AND r.outcome IN ('ok','empty')) AS ok_now,
         count(*) FILTER (WHERE r.started_at >= p.w_start AND r.started_at < p.w_end AND r.outcome IN ('ok','empty','timeout','unavailable')) AS all_now,
         count(*) FILTER (WHERE r.started_at >= p.p_start AND r.started_at < p.w_start AND r.outcome IN ('ok','empty')) AS ok_prev,
         count(*) FILTER (WHERE r.started_at >= p.p_start AND r.started_at < p.w_start AND r.outcome IN ('ok','empty','timeout','unavailable')) AS all_prev
  FROM wonderjobs.jobslake_runs r, p
  WHERE ${SOURCE_TRAFFIC} AND r.started_at >= p.p_start AND r.started_at < p.w_end
)
SELECT round(100.0 * ok_now / NULLIF(all_now, 0), 1)::numeric AS value,
       round(100.0 * ok_prev / NULLIF(all_prev, 0), 1)::numeric AS prev
FROM s`,
    },
    {
      kind: "breakdown", id: "source-failures", section: "health", label: "Job sources that failed (timeouts and outages)", format: "int",
      hint: "Failed source calls in the window by source. Admin-added boards are grouped so no employer is named.",
      sql: `WITH ${PARAMS}
-- NOTE: needs migration 0007 (JobsLake).
SELECT ${SOURCE_LABEL} AS label, count(*)::numeric AS value
FROM wonderjobs.jobslake_runs r, p
WHERE ${SOURCE_TRAFFIC} AND r.outcome IN ('timeout','unavailable') AND r.started_at >= p.w_start AND r.started_at < p.w_end
GROUP BY 1 ORDER BY 2 DESC LIMIT 12`,
    },
    {
      kind: "breakdown", id: "apply-failures", section: "health", label: "Apply with Wonder: why sessions stopped", format: "int",
      hint: "Failure codes of sessions started in the window (blank codes are not counted).",
      sql: `WITH ${PARAMS}
SELECT upper(substr(replace(lower(x.failure), '_', ' '), 1, 1)) || substr(replace(lower(x.failure), '_', ' '), 2) AS label, count(*)::numeric AS value
FROM wonderapps_dashboard.apply_session_facts x, p
WHERE x.failure IS NOT NULL AND x.started_at >= p.w_start AND x.started_at < p.w_end
GROUP BY x.failure ORDER BY 2 DESC LIMIT 12`,
    },
    {
      kind: "stat", id: "open-support-messages", section: "health", label: "Contact messages waiting", format: "int", good: "down", snapshot: true,
      hint: "Messages from the landing-page contact form that have not been marked handled.",
      sql: `WITH ${PARAMS}
-- NOTE: the product never sets handled_at; it only moves when someone marks a message handled by hand in the database.
-- Only the timestamps are read, never the name, email or message.
SELECT count(*)::numeric AS value
FROM wonderjobs.contact_messages m, p
WHERE m.handled_at IS NULL AND m.created_at < p.w_end`,
    },
    {
      kind: "stat", id: "oldest-support-message", section: "health", label: "Oldest waiting contact message", format: "hours", good: "down", snapshot: true,
      hint: "How long the oldest unhandled contact message has been waiting, measured at the window end.",
      sql: `WITH ${PARAMS}
SELECT round(extract(epoch FROM (p.w_end - min(m.created_at))) / 3600.0, 1)::numeric AS value
FROM wonderjobs.contact_messages m, p
WHERE m.handled_at IS NULL AND m.created_at < p.w_end
GROUP BY p.w_end`,
    },
  ],
};
