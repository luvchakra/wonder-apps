import type { AppDashboard, MetricDef } from "../types";

/**
 * WonderArk — five licensable modules (Discovery incl. Marketing and Funding, Inventory,
 * Service, CRM, Finance & GST) on one shared tenancy: account -> business -> members.
 *
 * Every query is a single read-only SELECT that returns aggregates only. Each starts with the
 * same `p` CTE so that all four bound parameters ($1..$4) are referenced and typed in every
 * statement (node-postgres rejects a bind that supplies more parameters than the statement uses):
 *   p.s = $1 window start, p.e = $2 window end, p.ps = $3 previous window start, p.tz = $4 time zone.
 *
 * The query text is composed from the constants below at module load. Nothing from a request,
 * a user or the database is ever interpolated; only $1..$4 are bound at run time.
 * Which tables and columns are read is mirrored, one for one, in
 * docs/dashboard/wonderark-readonly.sql (the least-privilege role).
 */

/** The bound parameters, typed once. */
const P = `p AS (SELECT $1::timestamptz AS s, $2::timestamptz AS e, $3::timestamptz AS ps, $4::text AS tz)`;

/**
 * Businesses that count. NOTE: a business is left out when it is disabled (core.businesses.disabled_at)
 * or when the platform-admin seeding tool has loaded demo data into it (a row in core.demo_seed_batches).
 * The schema has no is_test / is_internal flag, so the founder's own test businesses are NOT excluded
 * unless they were seeded or disabled.
 */
const RB = `rb AS (
    SELECT b.id, b.account_id, b.created_at
    FROM core.businesses b
    WHERE b.disabled_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM core.demo_seed_batches d WHERE d.business_id = b.id)
  )`;

/** Discovery is scoped by workspace; this maps a workspace to its business. */
const WS = `JOIN discovery.workspaces w ON w.id = {t}.workspace_id JOIN discovery.products dp ON dp.id = w.product_id`;

/**
 * User-attributed actions: one row per (user, business, time) wherever a table records WHO did it.
 * NOTE: Discovery's own prospect/scoring tables carry no user id, so a person who only reviews
 * Discovery results and writes nothing else is not seen here (see `ba` for the business-level view).
 * Automatic and system rows (no user id) are never counted.
 */
const UA_SOURCES: [table: string, userCol: string, tsCol: string][] = [
  ["core.audit_log", "actor_id", "created_at"],
  ["core.documents", "created_by", "created_at"],
  ["core.payments", "created_by", "created_at"],
  ["core.messages", "created_by", "created_at"],
  ["core.attachments", "uploaded_by", "created_at"],
  ["core.export_jobs", "requested_by", "created_at"],
  ["inventory.stock_movements", "created_by", "created_at"],
  ["inventory.stock_transfers", "requested_by", "created_at"],
  ["fsm.jobs", "created_by", "created_at"],
  ["fsm.opportunities", "created_by", "created_at"],
  ["fsm.notes", "author_id", "created_at"],
  ["fsm.events", "created_by", "created_at"],
  ["crm.crm_note", "author_id", "created_at"],
  ["discovery.marketing_campaigns", "created_by", "created_at"],
  ["discovery.marketing_content", "created_by", "created_at"],
  ["discovery.investor_interactions", "created_by", "created_at"],
  ["gst.journal_entries", "created_by", "created_at"],
];

/** `ua(uid, bid, ts)` restricted to [from, to). `from`/`to` are SQL expressions over `p`. */
const ua = (from: string, to: string) =>
  `ua AS (\n    ${UA_SOURCES.map(
    ([t, u, ts]) => `SELECT x.${u} AS uid, x.business_id AS bid, x.${ts} AS ts FROM ${t} x WHERE x.${u} IS NOT NULL AND x.${ts} >= ${from} AND x.${ts} < ${to}`,
  ).join("\n    UNION ALL\n    ")}\n  )`;

/**
 * `ba(bid, ts)`: business-level activity = every user-attributed action plus the human-driven
 * Discovery actions that carry no user id (a message typed to the assistant, prospect feedback,
 * an edit to the AI's offering profile).
 */
const ba = (from: string, to: string) => `${ua(from, to)},
  ba AS (
    SELECT bid, ts FROM ua
    UNION ALL
    SELECT dp.business_id, c.created_at FROM discovery.chat_messages c ${WS.replaceAll("{t}", "c")}
      WHERE c.role = 'user' AND c.created_at >= ${from} AND c.created_at < ${to}
    UNION ALL
    SELECT dp.business_id, c.created_at FROM discovery.prospect_feedback c ${WS.replaceAll("{t}", "c")}
      WHERE c.created_at >= ${from} AND c.created_at < ${to}
    UNION ALL
    SELECT dp.business_id, c.created_at FROM discovery.offering_feedback c ${WS.replaceAll("{t}", "c")}
      WHERE c.created_at >= ${from} AND c.created_at < ${to}
  )`;

const S = `(SELECT s FROM p)`;
const E = `(SELECT e FROM p)`;

/** DAU / WAU / MAU measured at the window end; prev is the same measure at the window start. */
const activeUsers = (days: number) => `WITH ${P}, ${RB}, ${ua(`${S} - interval '${days} days'`, E)}
SELECT count(DISTINCT ua.uid) FILTER (WHERE ua.ts >= p.e - interval '${days} days' AND ua.ts < p.e)::numeric AS value,
       count(DISTINCT ua.uid) FILTER (WHERE ua.ts >= p.s - interval '${days} days' AND ua.ts < p.s)::numeric AS prev
FROM p CROSS JOIN ua JOIN rb ON rb.id = ua.bid`;

/** Both AI ledgers. NOTE: core.ai_runs is keyed by business, discovery.ai_runs by workspace. Rows from the two are distinct. */
const RUNS = `runs AS (
    SELECT r.created_at AS ts, r.provider, r.model, r.status, r.input_tokens, r.output_tokens, r.estimated_cost, r.business_id AS bid
    FROM core.ai_runs r
    UNION ALL
    SELECT r.created_at, r.provider, r.model, r.status, r.input_tokens, r.output_tokens, r.estimated_cost, dp.business_id
    FROM discovery.ai_runs r ${WS.replaceAll("{t}", "r")}
  )`;

const metrics: MetricDef[] = [
  /* ------------------------------------------------------------------ audience */
  {
    kind: "stat", id: "total-businesses", section: "audience", label: "Businesses", format: "int", snapshot: true, headline: true,
    hint: "Businesses (tenants) that exist today, excluding disabled ones and ones loaded with demo data.",
    sql: `WITH ${P}, ${RB}
SELECT count(*)::numeric AS value FROM rb`,
  },
  {
    kind: "stat", id: "user-seats", section: "audience", label: "User seats", format: "int", snapshot: true,
    hint: "Active memberships across all businesses. A person in two businesses holds two seats.",
    sql: `WITH ${P}, ${RB}
SELECT count(*)::numeric AS value
FROM core.business_members m JOIN rb ON rb.id = m.business_id
WHERE m.status = 'active'`,
  },
  {
    kind: "stat", id: "new-businesses", section: "audience", label: "New businesses", format: "int", headline: true,
    hint: "Businesses created in the window (a business is created when someone finishes setting up their workspace).",
    sql: `WITH ${P}, ${RB}
SELECT count(*) FILTER (WHERE rb.created_at >= p.s AND rb.created_at < p.e)::numeric AS value,
       count(*) FILTER (WHERE rb.created_at >= p.ps AND rb.created_at < p.s)::numeric AS prev
FROM p CROSS JOIN rb`,
  },
  {
    kind: "stat", id: "dau", section: "audience", label: "Daily active users", format: "int", snapshot: true,
    hint: "Distinct people who did something in the product on the last day of the window; compared with the last day before it.",
    sql: activeUsers(1),
  },
  {
    kind: "stat", id: "wau", section: "audience", label: "Weekly active users", format: "int", snapshot: true,
    hint: "Distinct people active in the 7 days up to the window end; compared with the 7 days up to the window start.",
    sql: activeUsers(7),
  },
  {
    kind: "stat", id: "mau", section: "audience", label: "Monthly active users", format: "int", snapshot: true, headline: true,
    hint: "Distinct people active in the 30 days up to the window end; compared with the 30 days up to the window start.",
    sql: activeUsers(30),
  },
  {
    kind: "stat", id: "stickiness", section: "audience", label: "Stickiness (DAU / MAU)", format: "pct", snapshot: true,
    hint: "Daily active users as a share of monthly active users, at the window end; compared with the window start.",
    sql: `WITH ${P}, ${RB}, ${ua(`${S} - interval '30 days'`, E)},
m AS (
  SELECT count(DISTINCT ua.uid) FILTER (WHERE ua.ts >= p.e - interval '1 day' AND ua.ts < p.e) AS d,
         count(DISTINCT ua.uid) FILTER (WHERE ua.ts >= p.e - interval '30 days' AND ua.ts < p.e) AS mo,
         count(DISTINCT ua.uid) FILTER (WHERE ua.ts >= p.s - interval '1 day' AND ua.ts < p.s) AS dp,
         count(DISTINCT ua.uid) FILTER (WHERE ua.ts >= p.s - interval '30 days' AND ua.ts < p.s) AS mp
  FROM p CROSS JOIN ua JOIN rb ON rb.id = ua.bid
)
SELECT round(100.0 * d / nullif(mo, 0), 1)::numeric AS value,
       round(100.0 * dp / nullif(mp, 0), 1)::numeric AS prev
FROM m`,
  },
  {
    kind: "series", id: "signups-per-day", section: "audience", label: "New businesses per day", format: "int", style: "bars",
    sql: `WITH ${P}, ${RB}
SELECT date_trunc('day', rb.created_at AT TIME ZONE p.tz)::date AS day, count(*)::numeric AS value
FROM rb CROSS JOIN p
WHERE rb.created_at >= p.s AND rb.created_at < p.e
GROUP BY 1 ORDER BY 1`,
  },
  {
    kind: "funnel", id: "activation-funnel", section: "audience", label: "Activation of new businesses",
    hint: "Businesses created in the window, and how many reached each step. Each step is a subset of the one before. Businesses younger than 14 days at the window end cannot have returned yet, so the last step reads low for a recent window.",
    sql: `WITH ${P}, ${RB}, ${ba(`${S} + interval '7 days'`, E)},
c AS (
  SELECT rb.id, rb.created_at FROM rb CROSS JOIN p WHERE rb.created_at >= p.s AND rb.created_at < p.e
),
f AS (
  SELECT c.id,
    EXISTS (SELECT 1 FROM core.licenses l WHERE l.business_id = c.id) AS licensed,
    -- NOTE: "a record" = a contact/company, catalogue item, document, Discovery prospect, service job or CRM lead.
    (EXISTS (SELECT 1 FROM core.parties x WHERE x.business_id = c.id)
      OR EXISTS (SELECT 1 FROM core.items x WHERE x.business_id = c.id)
      OR EXISTS (SELECT 1 FROM core.documents x WHERE x.business_id = c.id)
      OR EXISTS (SELECT 1 FROM discovery.prospects x JOIN discovery.workspaces w ON w.id = x.workspace_id JOIN discovery.products dp ON dp.id = w.product_id WHERE dp.business_id = c.id)
      OR EXISTS (SELECT 1 FROM fsm.jobs x WHERE x.business_id = c.id)
      OR EXISTS (SELECT 1 FROM crm.lead x WHERE x.business_id = c.id)) AS has_record,
    -- NOTE: "invited" = an invitation was ever sent, or a second membership exists.
    (EXISTS (SELECT 1 FROM core.business_invitations i WHERE i.business_id = c.id)
      OR (SELECT count(*) FROM core.business_members m WHERE m.business_id = c.id AND m.status <> 'removed') > 1) AS invited,
    -- NOTE: "returned in week 2" = any activity 7 to 14 days after the business was created; only judged once 14 days have passed.
    (c.created_at + interval '14 days' <= (SELECT e FROM p)
      AND EXISTS (SELECT 1 FROM ba WHERE ba.bid = c.id AND ba.ts >= c.created_at + interval '7 days' AND ba.ts < c.created_at + interval '14 days')) AS returned
  FROM c
)
SELECT 1 AS step, 'Business created'::text AS label, count(*)::numeric AS value FROM f
UNION ALL SELECT 2, 'First module licensed', count(*) FILTER (WHERE licensed)::numeric FROM f
UNION ALL SELECT 3, 'First record created', count(*) FILTER (WHERE licensed AND has_record)::numeric FROM f
UNION ALL SELECT 4, 'Team member invited', count(*) FILTER (WHERE licensed AND has_record AND invited)::numeric FROM f
UNION ALL SELECT 5, 'Returned in week 2', count(*) FILTER (WHERE licensed AND has_record AND invited AND returned)::numeric FROM f
ORDER BY 1`,
  },
  {
    kind: "cohort", id: "retention-cohort", section: "audience", label: "Weekly retention of new businesses",
    hint: "Businesses grouped by the week they were created; each cell is how many did something in the product that many weeks later. Always the last 8 cohorts up to the window end. Week 0 counts those active in their first week.",
    sql: `WITH ${P}, ${RB}, ${ba(`${E} - interval '70 days'`, E)},
cur AS (
  SELECT date_trunc('week', (p.e - interval '1 microsecond') AT TIME ZONE p.tz)::date AS w FROM p
),
co AS (
  SELECT rb.id, date_trunc('week', rb.created_at AT TIME ZONE p.tz)::date AS cohort
  FROM rb CROSS JOIN p CROSS JOIN cur
  WHERE rb.created_at < p.e
    AND date_trunc('week', rb.created_at AT TIME ZONE p.tz)::date >= cur.w - 49
),
sizes AS (SELECT cohort, count(*) AS size FROM co GROUP BY 1),
ev AS (
  SELECT co.cohort, ((date_trunc('week', ba.ts AT TIME ZONE p.tz)::date - co.cohort) / 7) AS wk, count(DISTINCT ba.bid) AS n
  FROM ba JOIN co ON co.id = ba.bid CROSS JOIN p
  GROUP BY 1, 2
)
SELECT s.cohort, g.w::int AS week, coalesce(ev.n, 0)::int AS active, s.size::int AS size
FROM sizes s
CROSS JOIN cur
CROSS JOIN LATERAL generate_series(0, (cur.w - s.cohort) / 7) AS g(w)
LEFT JOIN ev ON ev.cohort = s.cohort AND ev.wk = g.w
ORDER BY 1, 2`,
  },

  /* ---------------------------------------------------------------- engagement */
  {
    kind: "series", id: "actions-per-day", section: "engagement", label: "Core actions per day", format: "int", stacked: true, style: "bars",
    hint: "Records created per day across the modules: invoices and other documents, prospects scored, stock movements, service jobs, CRM messages and posted journal entries.",
    sql: `WITH ${P}, ${RB}
SELECT date_trunc('day', x.created_at AT TIME ZONE p.tz)::date AS day, count(*)::numeric AS value, 'Invoices'::text AS series
FROM core.documents x JOIN rb ON rb.id = x.business_id CROSS JOIN p
WHERE x.doc_type = 'invoice' AND x.created_at >= p.s AND x.created_at < p.e GROUP BY 1
UNION ALL
SELECT date_trunc('day', x.created_at AT TIME ZONE p.tz)::date, count(*)::numeric, 'Other documents'
FROM core.documents x JOIN rb ON rb.id = x.business_id CROSS JOIN p
WHERE x.doc_type <> 'invoice' AND x.created_at >= p.s AND x.created_at < p.e GROUP BY 1
UNION ALL
SELECT date_trunc('day', x.created_at AT TIME ZONE p.tz)::date, count(*)::numeric, 'Prospects scored'
FROM discovery.prospect_scores x JOIN discovery.workspaces w ON w.id = x.workspace_id JOIN discovery.products dp ON dp.id = w.product_id
  JOIN rb ON rb.id = dp.business_id CROSS JOIN p
WHERE x.created_at >= p.s AND x.created_at < p.e GROUP BY 1
UNION ALL
SELECT date_trunc('day', x.created_at AT TIME ZONE p.tz)::date, count(*)::numeric, 'Stock movements'
FROM inventory.stock_movements x JOIN rb ON rb.id = x.business_id CROSS JOIN p
WHERE x.created_at >= p.s AND x.created_at < p.e GROUP BY 1
UNION ALL
SELECT date_trunc('day', x.created_at AT TIME ZONE p.tz)::date, count(*)::numeric, 'Service jobs'
FROM fsm.jobs x JOIN rb ON rb.id = x.business_id CROSS JOIN p
WHERE x.created_at >= p.s AND x.created_at < p.e GROUP BY 1
UNION ALL
SELECT date_trunc('day', x.occurred_at AT TIME ZONE p.tz)::date, count(*)::numeric, 'CRM messages'
FROM crm.interaction x JOIN rb ON rb.id = x.business_id CROSS JOIN p
WHERE x.occurred_at >= p.s AND x.occurred_at < p.e GROUP BY 1
UNION ALL
SELECT date_trunc('day', x.created_at AT TIME ZONE p.tz)::date, count(*)::numeric, 'Journal entries'
FROM gst.journal_entries x JOIN rb ON rb.id = x.business_id CROSS JOIN p
WHERE x.status = 'posted' AND x.created_at >= p.s AND x.created_at < p.e GROUP BY 1
ORDER BY 1, 3`,
  },
  {
    kind: "stat", id: "prospects-scored", section: "engagement", label: "Prospects scored", format: "int",
    hint: "Distinct Discovery prospects that received a score in the window.",
    sql: `WITH ${P}, ${RB}
SELECT count(DISTINCT x.prospect_id) FILTER (WHERE x.created_at >= p.s AND x.created_at < p.e)::numeric AS value,
       count(DISTINCT x.prospect_id) FILTER (WHERE x.created_at >= p.ps AND x.created_at < p.s)::numeric AS prev
FROM p CROSS JOIN discovery.prospect_scores x
JOIN discovery.workspaces w ON w.id = x.workspace_id JOIN discovery.products dp ON dp.id = w.product_id
JOIN rb ON rb.id = dp.business_id`,
  },
  {
    kind: "stat", id: "invoices-created", section: "engagement", label: "Invoices created", format: "int",
    hint: "Sales invoices created in the window (any status).",
    sql: `WITH ${P}, ${RB}
SELECT count(*) FILTER (WHERE x.created_at >= p.s AND x.created_at < p.e)::numeric AS value,
       count(*) FILTER (WHERE x.created_at >= p.ps AND x.created_at < p.s)::numeric AS prev
FROM p CROSS JOIN core.documents x JOIN rb ON rb.id = x.business_id
WHERE x.doc_type = 'invoice'`,
  },
  {
    kind: "stat", id: "service-jobs", section: "engagement", label: "Service jobs created", format: "int",
    hint: "Field-service jobs created in the window.",
    sql: `WITH ${P}, ${RB}
SELECT count(*) FILTER (WHERE x.created_at >= p.s AND x.created_at < p.e)::numeric AS value,
       count(*) FILTER (WHERE x.created_at >= p.ps AND x.created_at < p.s)::numeric AS prev
FROM p CROSS JOIN fsm.jobs x JOIN rb ON rb.id = x.business_id`,
  },
  {
    kind: "stat", id: "inbox-messages", section: "engagement", label: "Inbox messages", format: "int",
    hint: "Messages received or sent through the unified inbox (all channels, both directions) in the window.",
    sql: `WITH ${P}, ${RB}
SELECT count(*) FILTER (WHERE x.occurred_at >= p.s AND x.occurred_at < p.e)::numeric AS value,
       count(*) FILTER (WHERE x.occurred_at >= p.ps AND x.occurred_at < p.s)::numeric AS prev
FROM p CROSS JOIN crm.interaction x JOIN rb ON rb.id = x.business_id`,
  },

  /* ------------------------------------------------------------------- product */
  {
    kind: "breakdown", id: "module-adoption", section: "product", label: "Businesses per module", format: "int",
    hint: "Businesses with an active licence for each module today.",
    sql: `WITH ${P}, ${RB}
SELECT CASE l.module_key
         WHEN 'discovery' THEN 'Discovery'
         WHEN 'inventory' THEN 'Inventory'
         WHEN 'fsm' THEN 'Service'
         WHEN 'crm' THEN 'CRM'
         WHEN 'gst' THEN 'Finance & GST'
         ELSE initcap(l.module_key)
       END AS label,
       count(DISTINCT l.business_id)::numeric AS value
FROM core.licenses l JOIN rb ON rb.id = l.business_id
WHERE l.status = 'active'
GROUP BY l.module_key ORDER BY 2 DESC LIMIT 12`,
  },
  {
    kind: "breakdown", id: "discovery-feature-use", section: "product", label: "Discovery: businesses using each area", format: "int",
    hint: "Businesses that have used prospecting, marketing, funding or the AI website set-up (ever, not only in the window).",
    sql: `WITH ${P}, ${RB}
SELECT 'Prospecting'::text AS label, count(DISTINCT dp.business_id)::numeric AS value
FROM discovery.prospects x JOIN discovery.workspaces w ON w.id = x.workspace_id JOIN discovery.products dp ON dp.id = w.product_id JOIN rb ON rb.id = dp.business_id
UNION ALL
SELECT 'Marketing', count(DISTINCT u.business_id)::numeric
FROM (SELECT business_id FROM discovery.marketing_campaigns UNION SELECT business_id FROM discovery.marketing_content) u JOIN rb ON rb.id = u.business_id
UNION ALL
SELECT 'Funding', count(DISTINCT u.business_id)::numeric
FROM (SELECT business_id FROM discovery.funding_rounds UNION SELECT business_id FROM discovery.investors) u JOIN rb ON rb.id = u.business_id
UNION ALL
SELECT 'AI website set-up', count(DISTINCT x.business_id)::numeric
FROM discovery.website_onboarding_runs x JOIN rb ON rb.id = x.business_id
WHERE x.status = 'succeeded'
ORDER BY 2 DESC LIMIT 12`,
  },
  {
    kind: "stat", id: "gst-returns-filed", section: "product", label: "GST returns filed", format: "int",
    hint: "Return periods marked filed in the window (any return type or country).",
    sql: `WITH ${P}, ${RB}
SELECT count(*) FILTER (WHERE coalesce(x.filed_at, x.updated_at) >= p.s AND coalesce(x.filed_at, x.updated_at) < p.e)::numeric AS value,
       count(*) FILTER (WHERE coalesce(x.filed_at, x.updated_at) >= p.ps AND coalesce(x.filed_at, x.updated_at) < p.s)::numeric AS prev
FROM p CROSS JOIN gst.return_periods x JOIN rb ON rb.id = x.business_id
WHERE x.status = 'filed'`,
  },
  {
    kind: "stat", id: "einvoices-generated", section: "product", label: "E-invoices generated", format: "int",
    hint: "E-invoices (IRNs) generated in the window, including any cancelled afterwards.",
    sql: `WITH ${P}, ${RB}
SELECT count(*) FILTER (WHERE x.created_at >= p.s AND x.created_at < p.e)::numeric AS value,
       count(*) FILTER (WHERE x.created_at >= p.ps AND x.created_at < p.s)::numeric AS prev
FROM p CROSS JOIN gst.einvoices x JOIN rb ON rb.id = x.business_id`,
  },

  /* ------------------------------------------------------------------- revenue */
  {
    kind: "breakdown", id: "plan-mix", section: "revenue", label: "Plan mix", format: "int",
    hint: "Businesses on each plan today.",
    sql: `WITH ${P}, ${RB}
SELECT initcap(s.plan) AS label, count(*)::numeric AS value
FROM core.business_settings s JOIN rb ON rb.id = s.business_id
GROUP BY s.plan ORDER BY 2 DESC LIMIT 12`,
  },
  {
    kind: "breakdown", id: "modules-per-business", section: "revenue", label: "Licensed modules per business", format: "int",
    hint: "How many modules each business has active today (0 means none).",
    sql: `WITH ${P}, ${RB},
n AS (
  SELECT rb.id, count(l.id) FILTER (WHERE l.status = 'active') AS k
  FROM rb LEFT JOIN core.licenses l ON l.business_id = rb.id
  GROUP BY rb.id
)
SELECT CASE WHEN k = 1 THEN '1 module' ELSE k || ' modules' END AS label, count(*)::numeric AS value
FROM n GROUP BY k ORDER BY 2 DESC LIMIT 12`,
  },
  {
    kind: "stat", id: "paying-businesses", section: "revenue", label: "Paying businesses", format: "int", snapshot: true, headline: true,
    hint: "Businesses with a live, billed subscription (active, past due or set to cancel at period end). The free plan is not counted.",
    sql: `WITH ${P}, ${RB}
-- NOTE: provider 'internal' is the free plan; environment 'test' is sandbox billing and never counted.
SELECT count(DISTINCT s.business_id)::numeric AS value
FROM platform.subscriptions s JOIN rb ON rb.id = s.business_id
WHERE s.provider <> 'internal' AND s.environment = 'live'
  AND s.status IN ('active', 'past_due', 'cancel_scheduled')
  AND coalesce(s.amount, 0) > 0`,
  },
  {
    kind: "stat", id: "trials", section: "revenue", label: "Trials running", format: "int", snapshot: true,
    hint: "Live subscriptions currently in a trial period.",
    sql: `WITH ${P}, ${RB}
SELECT count(DISTINCT s.business_id)::numeric AS value
FROM platform.subscriptions s JOIN rb ON rb.id = s.business_id
WHERE s.provider <> 'internal' AND s.environment = 'live' AND s.status = 'trialing'`,
  },
  {
    kind: "stat", id: "mrr", section: "revenue", label: "MRR", format: "inr", snapshot: true, headline: true,
    hint: "Monthly recurring revenue in rupees: live billed subscriptions in INR, yearly plans divided by 12. Excludes trials and the free plan.",
    sql: `WITH ${P}, ${RB}
-- NOTE: platform.subscriptions.amount is in major units (rupees) per billing interval. Only INR subscriptions are summed;
-- USD/EUR/GBP subscriptions (Stripe) are not converted. Whether the price includes GST is whatever the plan price was set to.
SELECT coalesce(sum(CASE s.billing_interval WHEN 'year' THEN s.amount / 12 ELSE s.amount END), 0)::numeric AS value
FROM platform.subscriptions s JOIN rb ON rb.id = s.business_id
WHERE s.provider <> 'internal' AND s.environment = 'live'
  AND s.status IN ('active', 'past_due', 'cancel_scheduled')
  AND s.currency = 'INR' AND coalesce(s.amount, 0) > 0`,
  },
  {
    kind: "stat", id: "arr", section: "revenue", label: "ARR", format: "inr", snapshot: true,
    hint: "Annual recurring revenue: MRR times 12, same rules as MRR.",
    sql: `WITH ${P}, ${RB}
SELECT (coalesce(sum(CASE s.billing_interval WHEN 'year' THEN s.amount / 12 ELSE s.amount END), 0) * 12)::numeric AS value
FROM platform.subscriptions s JOIN rb ON rb.id = s.business_id
WHERE s.provider <> 'internal' AND s.environment = 'live'
  AND s.status IN ('active', 'past_due', 'cancel_scheduled')
  AND s.currency = 'INR' AND coalesce(s.amount, 0) > 0`,
  },
  {
    kind: "stat", id: "revenue-collected", section: "revenue", label: "Subscription revenue collected", format: "inr",
    hint: "Successful live subscription payments in INR in the window, net of tax and refunds.",
    sql: `WITH ${P}, ${RB}
-- NOTE: amount is the gross charge in rupees (tax is part of it), so tax_amount and refunded_amount are taken off.
SELECT coalesce(sum(bp.amount - coalesce(bp.tax_amount, 0) - bp.refunded_amount) FILTER (WHERE bp.paid_at >= p.s AND bp.paid_at < p.e), 0)::numeric AS value,
       coalesce(sum(bp.amount - coalesce(bp.tax_amount, 0) - bp.refunded_amount) FILTER (WHERE bp.paid_at >= p.ps AND bp.paid_at < p.s), 0)::numeric AS prev
FROM p CROSS JOIN platform.billing_payments bp JOIN rb ON rb.id = bp.business_id
WHERE bp.environment = 'live' AND bp.currency = 'INR'
  AND bp.status IN ('succeeded', 'partially_refunded', 'refunded') AND bp.paid_at IS NOT NULL`,
  },

  /* ------------------------------------------------------------------------ ai */
  {
    kind: "stat", id: "ai-runs", section: "ai", label: "AI runs", format: "int",
    hint: "AI calls made by the product in the window (successful and failed), across all modules.",
    sql: `WITH ${P}, ${RB}, ${RUNS}
SELECT count(*) FILTER (WHERE r.ts >= p.s AND r.ts < p.e)::numeric AS value,
       count(*) FILTER (WHERE r.ts >= p.ps AND r.ts < p.s)::numeric AS prev
FROM p CROSS JOIN runs r JOIN rb ON rb.id = r.bid`,
  },
  {
    kind: "series", id: "ai-runs-per-day", section: "ai", label: "AI runs per day, by provider", format: "int", stacked: true, style: "bars",
    sql: `WITH ${P}, ${RB}, ${RUNS}
SELECT date_trunc('day', r.ts AT TIME ZONE p.tz)::date AS day, count(*)::numeric AS value, coalesce(r.provider, 'unknown')::text AS series
FROM runs r JOIN rb ON rb.id = r.bid CROSS JOIN p
WHERE r.ts >= p.s AND r.ts < p.e
GROUP BY 1, 3 ORDER BY 1, 3`,
  },
  {
    kind: "stat", id: "ai-cost", section: "ai", label: "AI cost", format: "usd", good: "neutral", headline: true,
    hint: "Estimated provider cost of AI runs in the window, in US dollars (computed from token counts when the run was logged; runs without token counts add nothing).",
    sql: `WITH ${P}, ${RB}, ${RUNS}
SELECT coalesce(sum(r.estimated_cost) FILTER (WHERE r.ts >= p.s AND r.ts < p.e), 0)::numeric AS value,
       coalesce(sum(r.estimated_cost) FILTER (WHERE r.ts >= p.ps AND r.ts < p.s), 0)::numeric AS prev
FROM p CROSS JOIN runs r JOIN rb ON rb.id = r.bid`,
  },
  {
    kind: "stat", id: "ai-failure-rate", section: "ai", label: "AI failure rate", format: "pct", good: "down",
    hint: "Share of AI runs in the window that failed.",
    sql: `WITH ${P}, ${RB}, ${RUNS}
SELECT round(100.0 * count(*) FILTER (WHERE r.status = 'failed' AND r.ts >= p.s AND r.ts < p.e)
       / nullif(count(*) FILTER (WHERE r.ts >= p.s AND r.ts < p.e), 0), 1)::numeric AS value,
       round(100.0 * count(*) FILTER (WHERE r.status = 'failed' AND r.ts >= p.ps AND r.ts < p.s)
       / nullif(count(*) FILTER (WHERE r.ts >= p.ps AND r.ts < p.s), 0), 1)::numeric AS prev
FROM p CROSS JOIN runs r JOIN rb ON rb.id = r.bid`,
  },
  {
    kind: "stat", id: "byok-adoption", section: "ai", label: "Bring-your-own AI key", format: "pct", snapshot: true,
    hint: "Share of businesses that have connected their own AI provider key.",
    sql: `WITH ${P}, ${RB},
t AS (
  SELECT rb.id,
    (EXISTS (SELECT 1 FROM core.ai_provider_credentials c WHERE c.business_id = rb.id AND c.status = 'connected')
      OR EXISTS (SELECT 1 FROM discovery.ai_provider_credentials dc WHERE dc.account_id = rb.account_id AND dc.status = 'connected')) AS has_key
  FROM rb
)
SELECT round(100.0 * count(*) FILTER (WHERE has_key) / nullif(count(*), 0), 1)::numeric AS value FROM t`,
  },

  /* ----------------------------------------------------------------- health */
  {
    kind: "stat", id: "events-failed", section: "health", label: "Failed or stuck background events", format: "int", good: "down", snapshot: true,
    hint: "Internal events that ran out of retries, or are waiting more than an hour past their retry time. Events parked for an unlicensed module are normal and not counted.",
    sql: `WITH ${P}, ${RB}
SELECT count(*)::numeric AS value
FROM core.domain_events ev JOIN rb ON rb.id = ev.business_id CROSS JOIN p
WHERE ev.status = 'failed' OR (ev.status = 'pending' AND ev.next_attempt_at < p.e - interval '1 hour')`,
  },
  {
    kind: "stat", id: "channels-broken", section: "health", label: "Channel connections needing attention", format: "int", good: "down", snapshot: true,
    hint: "WhatsApp, Instagram, Messenger, Google and email connections that are degraded, need re-authorisation or report a provider error.",
    sql: `WITH ${P}, ${RB}
SELECT count(*)::numeric AS value
FROM crm.channel_connection cc JOIN rb ON rb.id = cc.business_id
WHERE cc.status IN ('degraded', 'reauthorization_required', 'provider_error')`,
  },
  {
    kind: "stat", id: "finance-exceptions", section: "health", label: "Open finance and GST exceptions", format: "int", good: "down", snapshot: true,
    hint: "Unposted documents or payments, ITC at risk, filing blockers and GSTR-2B mismatches still open.",
    sql: `WITH ${P}, ${RB}
SELECT ((SELECT count(*) FROM gst.finance_exceptions fe JOIN rb ON rb.id = fe.business_id WHERE fe.status IN ('open', 'in_review'))
      + (SELECT count(*) FROM gst.reconciliation_exceptions re JOIN rb ON rb.id = re.business_id WHERE re.status = 'open'))::numeric AS value`,
  },
  {
    kind: "stat", id: "licence-churn", section: "health", label: "Module licences ended", format: "int", good: "down",
    hint: "Module licences deactivated or expired in the window (a plan downgrade or a cancellation); data is kept.",
    sql: `WITH ${P}, ${RB}
SELECT count(*) FILTER (WHERE le.created_at >= p.s AND le.created_at < p.e)::numeric AS value,
       count(*) FILTER (WHERE le.created_at >= p.ps AND le.created_at < p.s)::numeric AS prev
FROM p CROSS JOIN core.license_events le JOIN rb ON rb.id = le.business_id
WHERE le.event_type IN ('deactivated', 'expired')`,
  },
  {
    kind: "stat", id: "payments-at-risk", section: "health", label: "Subscriptions past due or unpaid", format: "int", good: "down", snapshot: true,
    hint: "Live billed subscriptions whose last payment failed and has not been recovered.",
    sql: `WITH ${P}, ${RB}
SELECT count(DISTINCT s.business_id)::numeric AS value
FROM platform.subscriptions s JOIN rb ON rb.id = s.business_id
WHERE s.provider <> 'internal' AND s.environment = 'live' AND s.status IN ('past_due', 'unpaid')`,
  },
];

export const wonderark: AppDashboard = {
  slug: "wonderark",
  envVar: "WONDERARK_DATABASE_URL",
  focus: "Are new businesses getting set up, using a module and coming back — and is any of it turning into paid plans?",
  activeDefinition:
    "A person is active on a day if they created or changed something that records who did it: a document, payment, message, upload, export, stock movement, service job, CRM note, marketing or investor entry, journal entry, or an audited action. A business is active when any of those, or a message, feedback or edit made in Discovery, happened in it. Automatic runs, system rows and signing in without doing anything do not count. Demo-loaded and disabled businesses are left out.",
  metrics,
};
