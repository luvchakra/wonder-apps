import type { AppDashboard } from "../types";

/**
 * WonderID founder-dashboard metrics.
 *
 * Every query is fixed SQL (the only composition below is this module-load-time
 * concatenation of constant fragments; no runtime value is ever interpolated),
 * uses only $1..$4, and returns aggregates. The least-privilege database role
 * these queries run as is created by docs/dashboard/wonderid-readonly.sql, which
 * grants SELECT on exactly the columns read here (no emails, names, external ids,
 * identity attributes, free text, evidence, tokens, keys or credentials).
 *
 * Shared assumptions (also repeated as -- NOTE comments in the SQL):
 *  - "Real tenants" = tenants not deprovisioned and not flagged sandbox in
 *    platform_tenants (a tenant with no platform_tenants row is production).
 *  - Percent metrics are returned on a 0-100 scale (e.g. 23.5 means 23.5%).
 *  - Hour metrics are fractional hours.
 */

/**
 * CTE (without the WITH keyword) naming the tenants every metric is restricted to.
 *
 * It also references all four bound parameters with explicit types. A query that leaves a
 * parameter unreferenced is rejected by Postgres when the driver sends all four ("bind message
 * supplies 4 parameters, but prepared statement requires N"), and an untyped, unreferenced
 * parameter cannot be inferred. Pinning them here makes every metric accept the full
 * ($1, $2, $3, $4) list, so the runner can always bind all four.
 */
const RT = `rt AS (
  -- NOTE: demo/test tenants are flagged via platform_tenants.environment = 'sandbox'; no row means production.
  -- NOTE: the last line only pins the parameter types ($1..$4 are always bound); it never filters a row.
  SELECT t.id FROM public.tenants t
  LEFT JOIN public.platform_tenants pt ON pt.tenant_id = t.id
  WHERE t.status <> 'deprovisioned' AND COALESCE(pt.environment, 'production') = 'production'
    AND $1::timestamptz IS NOT NULL AND $2::timestamptz IS NOT NULL AND $3::timestamptz IS NOT NULL AND $4::text IS NOT NULL
)`;

/**
 * Rows of audit_logs that count as a person using the product: an audited action by a
 * signed-in user (not the system or an integration) in a real tenant, excluding vendor-console
 * 'platform.*' actions. Used by DAU/WAU/MAU, active tenants and retention.
 */
const USER_ACTIVITY = `a.actor_type = 'user' AND a.actor_id IS NOT NULL AND a.action NOT LIKE 'platform.%'`;

/** Finding statuses that still need work (everything not resolved/mitigated/false-positive/exception). */
const OPEN_FINDING = `('open', 'acknowledged', 'investigating', 'assigned', 'remediation_in_progress')`;

/** Latest subscription row per tenant (the app itself reads the latest by started_at). */
const LATEST_SUB = `latest_sub AS (
  SELECT DISTINCT ON (s.tenant_id) s.tenant_id, s.plan, s.status
  FROM public.subscriptions s
  ORDER BY s.tenant_id, s.started_at DESC
)`;

export const wonderid: AppDashboard = {
  slug: "wonderid",
  envVar: "WONDERID_DATABASE_URL",
  focus:
    "Are new enterprise tenants connecting a source, importing identities and governing their first AI agents, and do their people keep coming back to resolve findings?",
  activeDefinition:
    "A user is active on a day if they performed at least one audited action in a real (non-sandbox) tenant that day, such as approving a request, resolving a finding, importing identities or changing a policy. Sign-ins and read-only browsing are not recorded in the database, so activity is a floor, not a ceiling. Vendor-console and system or integration actions are excluded. DAU, WAU and MAU count distinct users over the 1, 7 and 30 days ending at the window end. A tenant is active in a period if any of its users were.",
  metrics: [
    /* ---------------------------------------------------------------- audience */
    {
      kind: "stat", id: "total-tenants", section: "audience", label: "Customer tenants", format: "int", snapshot: true, headline: true,
      hint: "Tenants that exist today, excluding deprovisioned and sandbox/demo tenants.",
      sql: `WITH ${RT}
SELECT count(*)::numeric AS value FROM rt`,
    },
    {
      kind: "stat", id: "new-tenants", section: "audience", label: "New tenants", format: "int", headline: true,
      hint: "Tenants created in the window, against the previous window of the same length.",
      sql: `WITH ${RT}
SELECT count(*) FILTER (WHERE t.created_at >= $1 AND t.created_at < $2)::numeric AS value,
       count(*) FILTER (WHERE t.created_at >= $3 AND t.created_at < $1)::numeric AS prev
FROM public.tenants t JOIN rt ON rt.id = t.id`,
    },
    {
      kind: "stat", id: "total-users", section: "audience", label: "Platform users", format: "int", snapshot: true,
      hint: "Distinct people with an active membership in at least one real tenant.",
      sql: `WITH ${RT}
-- NOTE: a person who belongs to two tenants is counted once.
SELECT count(DISTINCT tm.user_id)::numeric AS value
FROM public.tenant_memberships tm JOIN rt ON rt.id = tm.tenant_id
WHERE tm.status = 'active'`,
    },
    {
      kind: "stat", id: "dau", section: "audience", label: "Daily active users", format: "int", snapshot: true,
      hint: "Distinct users with an audited action in the 24 hours before the window end; the delta compares with 24 hours before the window start.",
      sql: `WITH ${RT}
-- NOTE: active = an audited action by a user (audit_logs.actor_type = 'user'); sign-ins are not stored.
SELECT count(DISTINCT a.actor_id) FILTER (WHERE a.created_at >= $2::timestamptz - interval '1 day' AND a.created_at < $2)::numeric AS value,
       count(DISTINCT a.actor_id) FILTER (WHERE a.created_at >= $1::timestamptz - interval '1 day' AND a.created_at < $1)::numeric AS prev
FROM public.audit_logs a JOIN rt ON rt.id = a.tenant_id
WHERE ${USER_ACTIVITY}
  AND a.created_at >= $1::timestamptz - interval '1 day' AND a.created_at < $2`,
    },
    {
      kind: "stat", id: "wau", section: "audience", label: "Weekly active users", format: "int", snapshot: true,
      hint: "Distinct users with an audited action in the 7 days before the window end; the delta compares with the 7 days before the window start.",
      sql: `WITH ${RT}
SELECT count(DISTINCT a.actor_id) FILTER (WHERE a.created_at >= $2::timestamptz - interval '7 days' AND a.created_at < $2)::numeric AS value,
       count(DISTINCT a.actor_id) FILTER (WHERE a.created_at >= $1::timestamptz - interval '7 days' AND a.created_at < $1)::numeric AS prev
FROM public.audit_logs a JOIN rt ON rt.id = a.tenant_id
WHERE ${USER_ACTIVITY}
  AND a.created_at >= $1::timestamptz - interval '7 days' AND a.created_at < $2`,
    },
    {
      kind: "stat", id: "mau", section: "audience", label: "Monthly active users", format: "int", snapshot: true, headline: true,
      hint: "Distinct users with an audited action in the 30 days before the window end; the delta compares with the 30 days before the window start.",
      sql: `WITH ${RT}
SELECT count(DISTINCT a.actor_id) FILTER (WHERE a.created_at >= $2::timestamptz - interval '30 days' AND a.created_at < $2)::numeric AS value,
       count(DISTINCT a.actor_id) FILTER (WHERE a.created_at >= $1::timestamptz - interval '30 days' AND a.created_at < $1)::numeric AS prev
FROM public.audit_logs a JOIN rt ON rt.id = a.tenant_id
WHERE ${USER_ACTIVITY}
  AND a.created_at >= $1::timestamptz - interval '30 days' AND a.created_at < $2`,
    },
    {
      kind: "stat", id: "stickiness", section: "audience", label: "Stickiness (DAU / MAU)", format: "pct", snapshot: true,
      hint: "Daily active users as a percentage of monthly active users at the window end (0-100). Blank when there were no active users.",
      sql: `WITH ${RT}, s AS (
  SELECT count(DISTINCT a.actor_id) FILTER (WHERE a.created_at >= $2::timestamptz - interval '1 day' AND a.created_at < $2) AS dau,
         count(DISTINCT a.actor_id) FILTER (WHERE a.created_at >= $2::timestamptz - interval '30 days' AND a.created_at < $2) AS mau,
         count(DISTINCT a.actor_id) FILTER (WHERE a.created_at >= $1::timestamptz - interval '1 day' AND a.created_at < $1) AS dau_prev,
         count(DISTINCT a.actor_id) FILTER (WHERE a.created_at >= $1::timestamptz - interval '30 days' AND a.created_at < $1) AS mau_prev
  FROM public.audit_logs a JOIN rt ON rt.id = a.tenant_id
  WHERE ${USER_ACTIVITY}
    AND a.created_at >= $1::timestamptz - interval '30 days' AND a.created_at < $2
)
SELECT round(100.0 * dau / NULLIF(mau, 0), 1)::numeric AS value,
       round(100.0 * dau_prev / NULLIF(mau_prev, 0), 1)::numeric AS prev
FROM s`,
    },
    {
      kind: "stat", id: "active-tenants", section: "audience", label: "Active tenants", format: "int", headline: true,
      hint: "Tenants where at least one user performed an audited action in the window, against the previous window.",
      sql: `WITH ${RT}
SELECT count(DISTINCT a.tenant_id) FILTER (WHERE a.created_at >= $1 AND a.created_at < $2)::numeric AS value,
       count(DISTINCT a.tenant_id) FILTER (WHERE a.created_at >= $3 AND a.created_at < $1)::numeric AS prev
FROM public.audit_logs a JOIN rt ON rt.id = a.tenant_id
WHERE ${USER_ACTIVITY}
  AND a.created_at >= $3 AND a.created_at < $2`,
    },
    {
      kind: "series", id: "tenant-signups", section: "audience", label: "Tenant signups per day", format: "int", style: "bars",
      sql: `WITH ${RT}
SELECT date_trunc('day', t.created_at AT TIME ZONE $4)::date AS day, count(*)::numeric AS value
FROM public.tenants t JOIN rt ON rt.id = t.id
WHERE t.created_at >= $1 AND t.created_at < $2
GROUP BY 1 ORDER BY 1`,
    },
    {
      kind: "funnel", id: "activation-funnel", section: "audience", label: "Tenant activation funnel (all tenants to date)",
      hint: "Of all real tenants, how many reached each step; each step is counted only among tenants that reached the one before.",
      sql: `WITH ${RT},
s1 AS (SELECT id AS tenant_id FROM rt),
-- NOTE: "connected a source" = created an identity source (CSV, SCIM, REST, HR feed or connector) or has a connected integration.
s2 AS (
  SELECT s1.tenant_id FROM s1
  WHERE EXISTS (SELECT 1 FROM public.identity_sources x WHERE x.tenant_id = s1.tenant_id)
     OR EXISTS (SELECT 1 FROM public.integrations i WHERE i.tenant_id = s1.tenant_id AND i.status = 'connected')
),
-- NOTE: "imported identities" = a non-preview reconciliation run that created records, or a connector sync that processed records.
s3 AS (
  SELECT s2.tenant_id FROM s2
  WHERE EXISTS (SELECT 1 FROM public.identity_reconciliation_runs r
                WHERE r.tenant_id = s2.tenant_id AND r.dry_run = false AND r.status IN ('succeeded', 'partial') AND r.created_count > 0)
     OR EXISTS (SELECT 1 FROM public.integration_sync_jobs j
                WHERE j.tenant_id = s2.tenant_id AND j.status IN ('succeeded', 'partial') AND j.records_processed > 0)
),
-- NOTE: "first agent governed" = an AI agent past the DISCOVERED stage (registered or later).
s4 AS (
  SELECT s3.tenant_id FROM s3
  WHERE EXISTS (SELECT 1 FROM public.agents g WHERE g.tenant_id = s3.tenant_id AND g.lifecycle_state <> 'DISCOVERED')
),
-- NOTE: "first outcome" = a finding resolved, or a certification campaign launched (active or completed).
s5 AS (
  SELECT s4.tenant_id FROM s4
  WHERE EXISTS (SELECT 1 FROM public.risk_findings f WHERE f.tenant_id = s4.tenant_id AND f.status = 'resolved')
     OR EXISTS (SELECT 1 FROM public.certification_campaigns c WHERE c.tenant_id = s4.tenant_id AND c.status IN ('active', 'completed'))
)
SELECT 1 AS step, 'Tenant created' AS label, count(*)::numeric AS value FROM s1
UNION ALL SELECT 2, 'Connected a source', count(*)::numeric FROM s2
UNION ALL SELECT 3, 'Imported identities', count(*)::numeric FROM s3
UNION ALL SELECT 4, 'Governed first AI agent', count(*)::numeric FROM s4
UNION ALL SELECT 5, 'Resolved a finding or ran a certification', count(*)::numeric FROM s5
ORDER BY 1`,
    },
    {
      kind: "cohort", id: "tenant-retention", section: "audience", label: "Weekly tenant retention (last 8 signup cohorts)",
      hint: "Tenants grouped by signup week; each cell is how many had a user perform an audited action that many weeks later.",
      sql: `WITH ${RT},
cur AS (SELECT date_trunc('week', ($2::timestamptz - interval '1 second') AT TIME ZONE $4)::date AS w),
cohorts AS (
  SELECT t.id AS tenant_id, date_trunc('week', t.created_at AT TIME ZONE $4)::date AS cohort
  FROM public.tenants t JOIN rt ON rt.id = t.id, cur
  WHERE t.created_at < $2
    AND date_trunc('week', t.created_at AT TIME ZONE $4)::date > cur.w - 56
),
sizes AS (SELECT cohort, count(*) AS size FROM cohorts GROUP BY 1),
act AS (
  SELECT DISTINCT a.tenant_id, date_trunc('week', a.created_at AT TIME ZONE $4)::date AS aw
  FROM public.audit_logs a JOIN cohorts c ON c.tenant_id = a.tenant_id
  WHERE ${USER_ACTIVITY}
    AND a.created_at >= $2::timestamptz - interval '64 days' AND a.created_at < $2
),
weeks AS (
  SELECT c.cohort, ((act.aw - c.cohort) / 7) AS week, count(DISTINCT c.tenant_id) AS active
  FROM cohorts c JOIN act ON act.tenant_id = c.tenant_id AND act.aw >= c.cohort
  GROUP BY 1, 2
)
SELECT s.cohort AS cohort, g.week::int AS week, COALESCE(w.active, 0)::int AS active, s.size::int AS size
FROM sizes s
CROSS JOIN cur
CROSS JOIN LATERAL generate_series(0, ((cur.w - s.cohort) / 7)) AS g(week)
LEFT JOIN weeks w ON w.cohort = s.cohort AND w.week = g.week
ORDER BY 1, 2`,
    },

    /* -------------------------------------------------------------- engagement */
    {
      kind: "stat", id: "access-requests", section: "engagement", label: "Access requests raised", format: "int",
      hint: "Access requests submitted in the window (any type, any status).",
      sql: `WITH ${RT}
SELECT count(*) FILTER (WHERE r.created_at >= $1 AND r.created_at < $2)::numeric AS value,
       count(*) FILTER (WHERE r.created_at >= $3 AND r.created_at < $1)::numeric AS prev
FROM public.access_requests r JOIN rt ON rt.id = r.tenant_id
WHERE r.created_at >= $3 AND r.created_at < $2`,
    },
    {
      kind: "stat", id: "request-turnaround", section: "engagement", label: "Median time to decide a request", format: "hours", good: "down",
      hint: "Median hours from an access request being raised to its decision, for requests decided in the window.",
      sql: `WITH ${RT}
-- NOTE: includes auto-approved requests, which decide in seconds and pull the median down.
SELECT round((percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM (r.decided_at - r.created_at)) / 3600.0)
         FILTER (WHERE r.decided_at >= $1 AND r.decided_at < $2))::numeric, 2) AS value,
       round((percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM (r.decided_at - r.created_at)) / 3600.0)
         FILTER (WHERE r.decided_at >= $3 AND r.decided_at < $1))::numeric, 2) AS prev
FROM public.access_requests r JOIN rt ON rt.id = r.tenant_id
WHERE r.decided_at IS NOT NULL AND r.status IN ('approved', 'rejected', 'fulfilled')
  AND r.decided_at >= $3 AND r.decided_at < $2`,
    },
    {
      kind: "stat", id: "identities-imported", section: "engagement", label: "Identity records reconciled", format: "int",
      hint: "Identity records created or updated by completed (non-preview) source reconciliation runs in the window.",
      sql: `WITH ${RT}
SELECT COALESCE(sum(r.created_count + r.updated_count) FILTER (WHERE r.created_at >= $1 AND r.created_at < $2), 0)::numeric AS value,
       COALESCE(sum(r.created_count + r.updated_count) FILTER (WHERE r.created_at >= $3 AND r.created_at < $1), 0)::numeric AS prev
FROM public.identity_reconciliation_runs r JOIN rt ON rt.id = r.tenant_id
WHERE r.dry_run = false AND r.status IN ('succeeded', 'partial') AND r.created_at >= $3 AND r.created_at < $2`,
    },
    {
      kind: "series", id: "core-actions", section: "engagement", label: "Core governance actions per day", format: "int", stacked: true, style: "bars",
      hint: "Access requests, approvals decided, identity imports, certification decisions, application onboardings promoted and access packages assigned.",
      sql: `WITH ${RT},
ev AS (
  SELECT r.created_at AS ts, 'Access requests' AS series
  FROM public.access_requests r JOIN rt ON rt.id = r.tenant_id WHERE r.created_at >= $1 AND r.created_at < $2
  UNION ALL
  SELECT ap.decided_at, 'Approvals decided'
  FROM public.access_request_approvals ap JOIN rt ON rt.id = ap.tenant_id
  WHERE ap.status IN ('approved', 'rejected') AND ap.decided_at >= $1 AND ap.decided_at < $2
  UNION ALL
  SELECT rr.created_at, 'Identity imports'
  FROM public.identity_reconciliation_runs rr JOIN rt ON rt.id = rr.tenant_id
  WHERE rr.dry_run = false AND rr.status IN ('succeeded', 'partial') AND rr.created_at >= $1 AND rr.created_at < $2
  UNION ALL
  SELECT d.decided_at, 'Certification decisions'
  FROM public.certification_decisions d
  JOIN public.certification_items ci ON ci.id = d.item_id
  JOIN rt ON rt.id = ci.tenant_id
  WHERE d.decided_at >= $1 AND d.decided_at < $2
  UNION ALL
  SELECT o.promoted_at, 'Applications onboarded'
  FROM public.application_onboardings o JOIN rt ON rt.id = o.tenant_id
  WHERE o.promoted_at >= $1 AND o.promoted_at < $2
  UNION ALL
  SELECT pa.created_at, 'Access packages assigned'
  FROM public.access_package_assignments pa JOIN rt ON rt.id = pa.tenant_id
  WHERE pa.created_at >= $1 AND pa.created_at < $2
)
SELECT date_trunc('day', ts AT TIME ZONE $4)::date AS day, count(*)::numeric AS value, series
FROM ev GROUP BY 1, 3 ORDER BY 1, 3`,
    },
    {
      kind: "series", id: "runtime-decisions", section: "engagement", label: "AI agent runtime decisions per day", format: "int", stacked: true, style: "bars",
      hint: "Decisions the runtime gateway returned to customers' AI agents, by outcome.",
      sql: `WITH ${RT}
SELECT date_trunc('day', d.created_at AT TIME ZONE $4)::date AS day, count(*)::numeric AS value, d.decision AS series
FROM public.runtime_decisions d JOIN rt ON rt.id = d.tenant_id
WHERE d.created_at >= $1 AND d.created_at < $2
GROUP BY 1, 3 ORDER BY 1, 3`,
    },

    /* ----------------------------------------------------------------- product */
    {
      kind: "stat", id: "agents-governed", section: "product", label: "AI agents governed", format: "int", snapshot: true, headline: true,
      hint: "AI agents past the discovered stage and not retired (registered, assessed, approved, active, restricted or suspended).",
      sql: `WITH ${RT}
SELECT count(*)::numeric AS value
FROM public.agents g JOIN rt ON rt.id = g.tenant_id
WHERE g.lifecycle_state NOT IN ('DISCOVERED', 'RETIRED')`,
    },
    {
      kind: "breakdown", id: "agents-by-lifecycle", section: "product", label: "AI agents by lifecycle state", format: "int",
      sql: `WITH ${RT}
SELECT g.lifecycle_state AS label, count(*)::numeric AS value
FROM public.agents g JOIN rt ON rt.id = g.tenant_id
GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 12`,
    },
    {
      kind: "breakdown", id: "identities-by-type", section: "product", label: "Identities under governance by type", format: "int",
      hint: "People, external users, machines, service accounts, applications, workloads, APIs and AI agents; archived and terminated identities excluded.",
      sql: `WITH ${RT}
SELECT i.identity_type AS label, count(*)::numeric AS value
FROM public.identities i JOIN rt ON rt.id = i.tenant_id
WHERE i.status NOT IN ('archived', 'terminated')
GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 12`,
    },
    {
      kind: "series", id: "findings-flow", section: "product", label: "Findings raised vs resolved per day", format: "int", stacked: true, style: "bars",
      hint: "Risk findings (SHOULD / CAN / DID deviations) raised, and findings closed as resolved.",
      sql: `WITH ${RT},
ev AS (
  SELECT f.created_at AS ts, 'Raised' AS series
  FROM public.risk_findings f JOIN rt ON rt.id = f.tenant_id
  WHERE f.created_at >= $1 AND f.created_at < $2
  UNION ALL
  SELECT f.resolved_at, 'Resolved'
  FROM public.risk_findings f JOIN rt ON rt.id = f.tenant_id
  WHERE f.status = 'resolved' AND f.resolved_at >= $1 AND f.resolved_at < $2
)
SELECT date_trunc('day', ts AT TIME ZONE $4)::date AS day, count(*)::numeric AS value, series
FROM ev GROUP BY 1, 3 ORDER BY 1, 3`,
    },
    {
      kind: "breakdown", id: "open-findings-by-severity", section: "product", label: "Open findings by severity", format: "int",
      hint: "Findings not yet resolved, mitigated, excepted or marked false positive.",
      sql: `WITH ${RT}
SELECT f.severity AS label, count(*)::numeric AS value
FROM public.risk_findings f JOIN rt ON rt.id = f.tenant_id
WHERE f.status IN ${OPEN_FINDING}
GROUP BY 1
ORDER BY CASE f.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END
LIMIT 12`,
    },
    {
      kind: "stat", id: "findings-mttr", section: "product", label: "Median time to resolve a finding", format: "hours", good: "down",
      hint: "Median hours from a finding being raised to it being resolved, for findings resolved in the window.",
      sql: `WITH ${RT}
SELECT round((percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM (f.resolved_at - f.created_at)) / 3600.0)
         FILTER (WHERE f.resolved_at >= $1 AND f.resolved_at < $2))::numeric, 1) AS value,
       round((percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM (f.resolved_at - f.created_at)) / 3600.0)
         FILTER (WHERE f.resolved_at >= $3 AND f.resolved_at < $1))::numeric, 1) AS prev
FROM public.risk_findings f JOIN rt ON rt.id = f.tenant_id
WHERE f.status = 'resolved' AND f.resolved_at IS NOT NULL AND f.resolved_at >= $3 AND f.resolved_at < $2`,
    },
    {
      kind: "stat", id: "accounts-correlated", section: "product", label: "Accounts tied to a known identity", format: "pct", snapshot: true,
      hint: "Share of active application accounts correlated to a person, machine or AI agent rather than orphaned or ambiguous (0-100).",
      sql: `WITH ${RT}
-- NOTE: effective-access coverage proxy; a low value means accounts exist that nobody owns.
SELECT round(100.0 * count(*) FILTER (WHERE ac.correlation IN ('correlated', 'manual')) / NULLIF(count(*), 0), 1)::numeric AS value
FROM public.accounts ac JOIN rt ON rt.id = ac.tenant_id
WHERE ac.status = 'active'`,
    },
    {
      kind: "stat", id: "apps-onboarded", section: "product", label: "Applications onboarded", format: "int", snapshot: true,
      hint: "Applications whose onboarding is complete and active (discovered or in-progress applications are not counted).",
      sql: `WITH ${RT}
SELECT count(*)::numeric AS value
FROM public.applications ap JOIN rt ON rt.id = ap.tenant_id
WHERE ap.onboarding_status = 'ACTIVE'`,
    },
    {
      kind: "breakdown", id: "identity-sources-by-type", section: "product", label: "Identity sources by connector type", format: "int",
      hint: "Active identity sources: CSV, SCIM, REST or HR feeds, or the connector type for integration-backed sources.",
      sql: `WITH ${RT}
SELECT CASE WHEN src.template = 'integration' THEN COALESCE(i.integration_type_id, 'integration') ELSE src.template END AS label,
       count(*)::numeric AS value
FROM public.identity_sources src
JOIN rt ON rt.id = src.tenant_id
LEFT JOIN public.integrations i ON i.id = src.integration_id AND i.tenant_id = src.tenant_id
WHERE src.status = 'active'
GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 12`,
    },
    {
      kind: "breakdown", id: "waiting-on-humans", section: "product", label: "Work waiting for a person", format: "int",
      hint: "Items customers' people still have to act on, by queue: approvals, ambiguous identity matches, lifecycle tasks, certification reviews, unrecognised applications and new findings.",
      sql: `WITH ${RT}
SELECT q.label, q.value::numeric AS value FROM (
  SELECT 'Access approvals pending' AS label, count(*) AS value
    FROM public.access_request_approvals ap JOIN rt ON rt.id = ap.tenant_id WHERE ap.status = 'pending'
  UNION ALL
  SELECT 'Ambiguous identity matches', count(*)
    FROM public.pending_identity_correlations pc JOIN rt ON rt.id = pc.tenant_id WHERE pc.status = 'pending'
  UNION ALL
  SELECT 'Joiner/mover/leaver tasks open', count(*)
    FROM public.identity_lifecycle_tasks lt JOIN rt ON rt.id = lt.tenant_id WHERE lt.status = 'open'
  UNION ALL
  SELECT 'Certification reviews pending', count(*)
    FROM public.certification_items ci JOIN rt ON rt.id = ci.tenant_id WHERE ci.status = 'pending'
  UNION ALL
  SELECT 'Unrecognised applications', count(*)
    FROM public.application_discoveries ad JOIN rt ON rt.id = ad.tenant_id WHERE ad.status = 'UNRECOGNIZED'
  UNION ALL
  SELECT 'New findings not yet picked up', count(*)
    FROM public.risk_findings f JOIN rt ON rt.id = f.tenant_id WHERE f.status = 'open'
) q
ORDER BY 2 DESC, 1 LIMIT 12`,
    },

    /* ----------------------------------------------------------------- revenue */
    {
      kind: "breakdown", id: "plan-mix", section: "revenue", label: "Tenants by plan", format: "int",
      hint: "Each real tenant's latest subscription plan; cancelled subscriptions and tenants with none are shown separately.",
      sql: `WITH ${RT}, ${LATEST_SUB}
-- NOTE: the database stores plan tiers (free / pro / max / enterprise) and limits only; there are no prices or invoices.
SELECT CASE WHEN ls.tenant_id IS NULL THEN 'no subscription'
            WHEN ls.status = 'cancelled' THEN 'cancelled'
            ELSE ls.plan END AS label,
       count(*)::numeric AS value
FROM rt LEFT JOIN latest_sub ls ON ls.tenant_id = rt.id
GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 12`,
    },
    {
      kind: "stat", id: "paid-tier-tenants", section: "revenue", label: "Tenants on a paid tier", format: "int", snapshot: true,
      hint: "Real tenants whose current subscription is pro, max or enterprise and not cancelled. Plan assignment only: no billing data exists in the database, so this is not confirmed payment.",
      sql: `WITH ${RT}, ${LATEST_SUB}
SELECT count(*)::numeric AS value
FROM rt JOIN latest_sub ls ON ls.tenant_id = rt.id
WHERE ls.plan IN ('pro', 'max', 'enterprise') AND ls.status IN ('active', 'past_due')`,
    },

    /* ---------------------------------------------------------------------- ai */
    {
      kind: "stat", id: "ai-assisted-runs", section: "ai", label: "AI-assisted onboarding proposals", format: "int",
      hint: "Application-onboarding proposals in the window where an AI model refined the deterministic proposal. Tokens and cost are not stored.",
      sql: `WITH ${RT}
SELECT count(*) FILTER (WHERE p.created_at >= $1 AND p.created_at < $2)::numeric AS value,
       count(*) FILTER (WHERE p.created_at >= $3 AND p.created_at < $1)::numeric AS prev
FROM public.onboarding_proposals p JOIN rt ON rt.id = p.tenant_id
WHERE p.ai_used = true AND p.created_at >= $3 AND p.created_at < $2`,
    },
    {
      kind: "series", id: "ai-proposals-by-provider", section: "ai", label: "Onboarding proposals per day by AI provider", format: "int", stacked: true, style: "bars",
      hint: "Proposals per day; 'deterministic only' means no AI model was used.",
      sql: `WITH ${RT}
SELECT date_trunc('day', p.created_at AT TIME ZONE $4)::date AS day, count(*)::numeric AS value,
       CASE WHEN p.ai_used THEN COALESCE(p.ai_provider, 'unknown') ELSE 'deterministic only' END AS series
FROM public.onboarding_proposals p JOIN rt ON rt.id = p.tenant_id
WHERE p.created_at >= $1 AND p.created_at < $2
GROUP BY 1, 3 ORDER BY 1, 3`,
    },
    {
      kind: "breakdown", id: "ai-key-mix", section: "ai", label: "Tenants' AI provider and key", format: "int",
      hint: "Tenants that configured an AI provider, split by provider and whether they bring their own key or use the platform's.",
      sql: `WITH ${RT}
SELECT c.provider || CASE WHEN c.use_own_key THEN ' (own key)' ELSE ' (platform key)' END AS label,
       count(*)::numeric AS value
FROM public.platform_ai_provider_configs c JOIN rt ON rt.id = c.tenant_id
GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 12`,
    },

    /* ------------------------------------------------------------------ health */
    {
      kind: "stat", id: "open-critical-findings", section: "health", label: "Open critical findings", format: "int", snapshot: true, good: "down", headline: true,
      hint: "Critical-severity findings across all real tenants that are still open, acknowledged, assigned or being remediated.",
      sql: `WITH ${RT}
SELECT count(*)::numeric AS value
FROM public.risk_findings f JOIN rt ON rt.id = f.tenant_id
WHERE f.severity = 'critical' AND f.status IN ${OPEN_FINDING}`,
    },
    {
      kind: "stat", id: "failed-syncs", section: "health", label: "Failed syncs and imports", format: "int", good: "down",
      hint: "Connector sync jobs and identity reconciliation runs that ended in failure in the window.",
      sql: `WITH ${RT},
f AS (
  SELECT j.created_at AS ts FROM public.integration_sync_jobs j JOIN rt ON rt.id = j.tenant_id
  WHERE j.status = 'failed' AND j.created_at >= $3 AND j.created_at < $2
  UNION ALL
  SELECT r.created_at FROM public.identity_reconciliation_runs r JOIN rt ON rt.id = r.tenant_id
  WHERE r.status = 'failed' AND r.dry_run = false AND r.created_at >= $3 AND r.created_at < $2
)
SELECT count(*) FILTER (WHERE ts >= $1 AND ts < $2)::numeric AS value,
       count(*) FILTER (WHERE ts >= $3 AND ts < $1)::numeric AS prev
FROM f`,
    },
    {
      kind: "stat", id: "stuck-jobs", section: "health", label: "Stuck sync and import jobs", format: "int", snapshot: true, good: "down",
      hint: "Sync jobs and reconciliation runs still queued or running more than an hour after they were created, as of now.",
      sql: `WITH ${RT}
-- NOTE: status is read as it is now, so this is "stuck as of now" (the window end is capped at now(), since
-- a window usually ends at tomorrow's midnight); it does not reconstruct the state at a past window end.
SELECT (
  (SELECT count(*) FROM public.integration_sync_jobs j JOIN rt ON rt.id = j.tenant_id
    WHERE j.status IN ('queued', 'running') AND j.created_at < LEAST($2::timestamptz, now()) - interval '1 hour')
  +
  (SELECT count(*) FROM public.identity_reconciliation_runs r JOIN rt ON rt.id = r.tenant_id
    WHERE r.status IN ('queued', 'running') AND r.created_at < LEAST($2::timestamptz, now()) - interval '1 hour')
)::numeric AS value`,
    },
    {
      kind: "stat", id: "overdue-approvals", section: "health", label: "Approvals overdue", format: "int", snapshot: true, good: "down",
      hint: "Approval steps still pending past their due date as of now (or the window end, if earlier); customers' requesters are blocked on these.",
      sql: `WITH ${RT}
-- NOTE: "pending" is the current status, so this is overdue as of now, not reconstructed for a past window end.
SELECT count(*)::numeric AS value
FROM public.access_request_approvals ap JOIN rt ON rt.id = ap.tenant_id
WHERE ap.status = 'pending' AND ap.due_at IS NOT NULL AND ap.due_at < LEAST($2::timestamptz, now())`,
    },
    {
      kind: "stat", id: "past-due-subscriptions", section: "health", label: "Past-due subscriptions", format: "int", snapshot: true, good: "down",
      hint: "Real tenants whose latest subscription is marked past due: the ones that need a conversation.",
      sql: `WITH ${RT}, ${LATEST_SUB}
SELECT count(*)::numeric AS value
FROM rt JOIN latest_sub ls ON ls.tenant_id = rt.id
WHERE ls.status = 'past_due'`,
    },
  ],
};
