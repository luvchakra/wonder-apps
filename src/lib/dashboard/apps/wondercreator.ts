import type { AppDashboard, MetricDef } from "../types";

/*
 * Wonder Creator founder metrics.
 *
 * Every query is a single read-only SELECT over the product's own app tables (public.*), returns aggregates
 * only, and is granted column by column to the `wonderapps_dashboard` role (docs/dashboard/wondercreator-readonly.sql).
 * Nothing here reads auth.users, names, handles, emails, locations, titles, bodies, notes, URLs or tokens.
 *
 * Every query opens with the same `p` CTE. The runner always binds four parameters, and Postgres rejects a
 * statement that references fewer ("bind message supplies 4 parameters ..."); `p` references all four with
 * explicit types, so each query is valid whatever else it uses. `p.ref` is "now, capped at the window end":
 * the instant DAU / WAU / MAU are measured at, so a window that ends tomorrow still reads a full trailing day.
 */

const P = `p AS (
  SELECT $1::timestamptz AS s, $2::timestamptz AS e, $3::timestamptz AS ps, $4::text AS tz,
         least($2::timestamptz, now()) AS ref
)`;

/** WITH p AS (...) [, extra CTEs] <select>. */
const q = (select: string, ctes = "") => `WITH ${P}${ctes ? `,\n${ctes}` : ""}\n${select}`;

/** Local calendar day of a timestamptz column in the dashboard time zone. */
const day = (col: string) => `date_trunc('day', ${col} AT TIME ZONE p.tz)::date`;

/**
 * Creator activity events: (creator_id, ts) for each deliberate thing a creator does. See `activeDefinition`.
 * `lo` is a SQL expression for the earliest instant needed, so every branch is bounded and can use its index.
 */
const events = (lo: string) => `
  SELECT creator_id, ts FROM (
    SELECT creator_id, created_at AS ts FROM public.creative_materials WHERE created_at >= ${lo} AND created_at < $2::timestamptz
    UNION ALL
    SELECT creator_id, created_at FROM public.artifacts WHERE created_at >= ${lo} AND created_at < $2::timestamptz
    UNION ALL
    -- NOTE: AI-authored versions are not creator activity; a collaborator's edit counts for the collaborator.
    SELECT coalesce(created_by_creator_id, creator_id), created_at FROM public.artifact_versions
      WHERE author_kind <> 'ai' AND created_at >= ${lo} AND created_at < $2::timestamptz
    UNION ALL
    SELECT creator_id, created_at FROM public.conversation_messages WHERE role = 'creator' AND created_at >= ${lo} AND created_at < $2::timestamptz
    UNION ALL
    SELECT creator_id, started_at FROM public.ai_runs WHERE started_at >= ${lo} AND started_at < $2::timestamptz
    UNION ALL
    SELECT creator_id, created_at FROM public.image_generations WHERE created_at >= ${lo} AND created_at < $2::timestamptz
    UNION ALL
    SELECT creator_id, created_at FROM public.scrapbook_posts WHERE created_at >= ${lo} AND created_at < $2::timestamptz
    UNION ALL
    SELECT creator_id, created_at FROM public.scrapbook_replies WHERE created_at >= ${lo} AND created_at < $2::timestamptz
    UNION ALL
    SELECT creator_id, created_at FROM public.open_conversations
      WHERE removed_at IS NULL AND created_at >= ${lo} AND created_at < $2::timestamptz
    UNION ALL
    SELECT creator_id, created_at FROM public.open_conversation_replies
      WHERE deleted_at IS NULL AND removed_at IS NULL AND created_at >= ${lo} AND created_at < $2::timestamptz
    UNION ALL
    SELECT creator_id, created_at FROM public.crew_messages WHERE created_at >= ${lo} AND created_at < $2::timestamptz
    UNION ALL
    SELECT creator_id, created_at FROM public.direct_messages WHERE created_at >= ${lo} AND created_at < $2::timestamptz
    UNION ALL
    SELECT creator_id, joined_at FROM public.huddle_participants WHERE joined_at >= ${lo} AND joined_at < $2::timestamptz
    UNION ALL
    SELECT creator_id, created_at FROM public.artifact_comments WHERE created_at >= ${lo} AND created_at < $2::timestamptz
  ) x`;

/** Enough history for MAU at the window end and at the previous window's end. */
const MAU_LO = `$3::timestamptz - interval '30 days'`;

/** Distinct active creators in the trailing `n` days at p.ref, and the same n days ending one window earlier. */
const trailing = (n: number) => ({
  value: `count(DISTINCT ev.creator_id) FILTER (WHERE ev.ts >= p.ref - interval '${n} days' AND ev.ts < p.ref)`,
  prev: `count(DISTINCT ev.creator_id) FILTER (WHERE ev.ts >= p.ref - (p.e - p.s) - interval '${n} days' AND ev.ts < p.ref - (p.e - p.s))`,
});

const dau = trailing(1);
const wau = trailing(7);
const mau = trailing(30);

/** Material types folded into the five kinds a founder thinks in. */
const MATERIAL_KIND = `CASE m.type::text
      WHEN 'idea' THEN 'Text & ideas' WHEN 'note' THEN 'Text & ideas' WHEN 'text' THEN 'Text & ideas'
      WHEN 'voice' THEN 'Voice & audio' WHEN 'audio' THEN 'Voice & audio'
      WHEN 'image' THEN 'Photos & sketches' WHEN 'sketch' THEN 'Photos & sketches'
      WHEN 'pdf' THEN 'PDFs & documents' WHEN 'document' THEN 'PDFs & documents'
      WHEN 'url' THEN 'Links'
      WHEN 'video' THEN 'Video'
      ELSE 'Other' END`;

const metrics: MetricDef[] = [
  /* ------------------------------------------------------------------ audience */
  {
    kind: "stat", id: "total-creators", section: "audience", label: "Creators", format: "int", snapshot: true, headline: true,
    hint: "Creator accounts that exist at the end of the window (one per sign-up).",
    sql: q(`SELECT count(*)::numeric AS value FROM public.creators c, p WHERE c.created_at < p.e`),
  },
  {
    kind: "stat", id: "new-creators", section: "audience", label: "New creators", format: "int", headline: true,
    hint: "Accounts created in the window.",
    sql: q(`SELECT count(*) FILTER (WHERE c.created_at >= p.s AND c.created_at < p.e)::numeric AS value,
       count(*) FILTER (WHERE c.created_at >= p.ps AND c.created_at < p.s)::numeric AS prev
FROM public.creators c, p
WHERE c.created_at >= p.ps AND c.created_at < p.e`),
  },
  {
    kind: "stat", id: "dau", section: "audience", label: "Daily active creators", format: "int", snapshot: true,
    hint: "Distinct creators with a deliberate action in the trailing 24 hours at the window end. Compared with the same measure one window earlier.",
    sql: q(`SELECT ${dau.value}::numeric AS value, ${dau.prev}::numeric AS prev FROM ev, p`, `ev AS (${events(MAU_LO)})`),
  },
  {
    kind: "stat", id: "wau", section: "audience", label: "Weekly active creators", format: "int", snapshot: true, headline: true,
    hint: "Distinct creators with a deliberate action in the trailing 7 days at the window end. Compared with one window earlier.",
    sql: q(`SELECT ${wau.value}::numeric AS value, ${wau.prev}::numeric AS prev FROM ev, p`, `ev AS (${events(MAU_LO)})`),
  },
  {
    kind: "stat", id: "mau", section: "audience", label: "Monthly active creators", format: "int", snapshot: true,
    hint: "Distinct creators with a deliberate action in the trailing 30 days at the window end. Compared with one window earlier.",
    sql: q(`SELECT ${mau.value}::numeric AS value, ${mau.prev}::numeric AS prev FROM ev, p`, `ev AS (${events(MAU_LO)})`),
  },
  {
    kind: "stat", id: "stickiness", section: "audience", label: "Stickiness (DAU / MAU)", format: "pct", snapshot: true, headline: true,
    hint: "Daily actives as a share of monthly actives, both at the window end. Higher means more creators come back often.",
    sql: q(
      `SELECT round(100.0 * ${dau.value} / nullif(${mau.value}, 0), 1)::numeric AS value,
       round(100.0 * ${dau.prev} / nullif(${mau.prev}, 0), 1)::numeric AS prev
FROM ev, p`,
      `ev AS (${events(MAU_LO)})`,
    ),
  },
  {
    kind: "series", id: "signups", section: "audience", label: "Sign-ups per day", format: "int", style: "bars",
    sql: q(`SELECT ${day("c.created_at")} AS day, count(*)::numeric AS value
FROM public.creators c, p
WHERE c.created_at >= p.s AND c.created_at < p.e
GROUP BY 1 ORDER BY 1`),
  },
  {
    kind: "funnel", id: "activation-funnel", section: "audience", label: "Activation of new creators",
    hint: "Creators who signed up in the window, then how many ever captured a material, used CreativeMind, made a Creation, and published or shared. Each step is a subset of the one before; recent sign-ups have had less time.",
    sql: q(
      `SELECT 1 AS step, 'Signed up' AS label, (SELECT count(*) FROM s1)::numeric AS value
UNION ALL SELECT 2, 'Captured a material', (SELECT count(*) FROM s2)::numeric
UNION ALL SELECT 3, 'Connected or used CreativeMind', (SELECT count(*) FROM s3)::numeric
UNION ALL SELECT 4, 'Made a Creation', (SELECT count(*) FROM s4)::numeric
UNION ALL SELECT 5, 'Published or shared', (SELECT count(*) FROM s5)::numeric
ORDER BY 1`,
      `s1 AS (SELECT c.id FROM public.creators c, p WHERE c.created_at >= p.s AND c.created_at < p.e),
s2 AS (
  -- NOTE: "ever" semantics: archived items still count, they were made.
  SELECT id FROM s1 WHERE EXISTS (SELECT 1 FROM public.creative_materials x WHERE x.creator_id = s1.id)
),
s3 AS (
  -- NOTE: connected = a bring-your-own key that is not known-invalid; used = at least one run that finished.
  SELECT id FROM s2 WHERE EXISTS (SELECT 1 FROM public.ai_runs r WHERE r.creator_id = s2.id AND r.status = 'succeeded')
     OR EXISTS (SELECT 1 FROM public.creator_ai_keys k WHERE k.creator_id = s2.id AND k.status <> 'invalid')
),
s4 AS (SELECT id FROM s3 WHERE EXISTS (SELECT 1 FROM public.artifacts a WHERE a.creator_id = s3.id)),
s5 AS (
  SELECT id FROM s4 WHERE EXISTS (SELECT 1 FROM public.published_works w WHERE w.creator_id = s4.id)
     OR EXISTS (SELECT 1 FROM public.publications pb WHERE pb.creator_id = s4.id AND pb.status = 'published')
     OR EXISTS (SELECT 1 FROM public.artifact_shares sh WHERE sh.creator_id = s4.id)
     OR EXISTS (SELECT 1 FROM public.creator_pages cp WHERE cp.creator_id = s4.id AND cp.is_published)
)`,
    ),
  },
  {
    kind: "cohort", id: "weekly-retention", section: "audience", label: "Weekly retention by sign-up week",
    hint: "Creators who signed up in a week, and how many did something deliberate in each following week (week 0 is the sign-up week; the current week is partial). Weeks start on Monday in the dashboard time zone.",
    sql: q(
      `SELECT cs.cohort, w.week::int AS week,
       (SELECT count(*) FROM c JOIN a ON a.creator_id = c.id AND a.wk = cs.cohort + w.week * 7 WHERE c.cohort = cs.cohort)::int AS active,
       cs.size
FROM cs CROSS JOIN cur CROSS JOIN LATERAL generate_series(0, (cur.wk - cs.cohort) / 7) AS w(week)
ORDER BY 1, 2`,
      `cur AS (SELECT date_trunc('week', (p.ref - interval '1 second') AT TIME ZONE p.tz)::date AS wk FROM p),
c AS (
  SELECT cr.id, date_trunc('week', cr.created_at AT TIME ZONE p.tz)::date AS cohort
  FROM public.creators cr, p, cur
  WHERE cr.created_at >= ((cur.wk - 49)::timestamp AT TIME ZONE p.tz) AND cr.created_at < p.e
),
cs AS (SELECT cohort, count(*)::int AS size FROM c GROUP BY 1),
a AS (
  SELECT DISTINCT ev.creator_id, date_trunc('week', ev.ts AT TIME ZONE p.tz)::date AS wk
  FROM (${events(`$2::timestamptz - interval '63 days'`)}) ev, p
)`,
    ),
  },

  /* ---------------------------------------------------------------- engagement */
  {
    kind: "stat", id: "materials-captured", section: "engagement", label: "Materials captured", format: "int",
    hint: "Materials added in the window (notes, ideas, photos, voice, PDFs, links, video), including ones later archived.",
    sql: q(`SELECT count(*) FILTER (WHERE m.created_at >= p.s AND m.created_at < p.e)::numeric AS value,
       count(*) FILTER (WHERE m.created_at >= p.ps AND m.created_at < p.s)::numeric AS prev
FROM public.creative_materials m, p
WHERE m.created_at >= p.ps AND m.created_at < p.e`),
  },
  {
    kind: "stat", id: "creations-made", section: "engagement", label: "Creations made", format: "int", headline: true,
    hint: "Creations started in the window (writing, carousels, images, audio, video, presentations), including ones later archived.",
    sql: q(`SELECT count(*) FILTER (WHERE a.created_at >= p.s AND a.created_at < p.e)::numeric AS value,
       count(*) FILTER (WHERE a.created_at >= p.ps AND a.created_at < p.s)::numeric AS prev
FROM public.artifacts a, p
WHERE a.created_at >= p.ps AND a.created_at < p.e`),
  },
  {
    kind: "series", id: "materials-per-day", section: "engagement", label: "Materials captured per day, by kind", format: "int", stacked: true, style: "bars",
    hint: "Text & ideas, voice & audio, photos & sketches, PDFs & documents, links, video.",
    sql: q(`SELECT ${day("m.created_at")} AS day, count(*)::numeric AS value, ${MATERIAL_KIND} AS series
FROM public.creative_materials m, p
WHERE m.created_at >= p.s AND m.created_at < p.e
GROUP BY 1, 3 ORDER BY 1, 3`),
  },
  {
    kind: "series", id: "creations-per-day", section: "engagement", label: "Creations made per day, by category", format: "int", stacked: true, style: "bars",
    sql: q(`SELECT ${day("a.created_at")} AS day, count(*)::numeric AS value, initcap(a.category) AS series
FROM public.artifacts a, p
WHERE a.created_at >= p.s AND a.created_at < p.e
GROUP BY 1, 3 ORDER BY 1, 3`),
  },
  {
    kind: "breakdown", id: "creations-by-format", section: "engagement", label: "Creations by format", format: "int",
    hint: "Creations started in the window, by type (poem, carousel, song, photograph...).",
    sql: q(`SELECT initcap(replace(a.artifact_type, '_', ' ')) AS label, count(*)::numeric AS value
FROM public.artifacts a, p
WHERE a.created_at >= p.s AND a.created_at < p.e
GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 12`),
  },

  /* ------------------------------------------------------------------- product */
  {
    kind: "stat", id: "works-published", section: "product", label: "Works published", format: "int", headline: true,
    hint: "Creations published to a public address for the first time in the window (later updates and unpublishing are not counted).",
    sql: q(`SELECT count(*) FILTER (WHERE r.published_at >= p.s AND r.published_at < p.e)::numeric AS value,
       count(*) FILTER (WHERE r.published_at >= p.ps AND r.published_at < p.s)::numeric AS prev
FROM public.published_revisions r, p
WHERE r.revision_number = 1 AND r.published_at >= p.ps AND r.published_at < p.e`),
  },
  {
    kind: "stat", id: "creator-pages-live", section: "product", label: "Creator Pages live", format: "int", snapshot: true,
    hint: "Creators whose public Creator Page is switched on.",
    sql: q(`SELECT count(*)::numeric AS value FROM public.creator_pages cp, p WHERE cp.is_published`),
  },
  {
    kind: "series", id: "published-views", section: "product", label: "Views of published works", format: "int", style: "area",
    hint: "Views of public works and pages per day. Days are the database's UTC calendar day, not the dashboard time zone; visits by the author and by crawlers are not filtered out.",
    sql: q(`SELECT st.day AS day, sum(st.views)::numeric AS value
FROM public.published_work_stats st, p
WHERE st.day >= (p.s AT TIME ZONE p.tz)::date AND st.day < (p.e AT TIME ZONE p.tz)::date
GROUP BY 1 ORDER BY 1`),
  },
  {
    kind: "stat", id: "rooms-created", section: "product", label: "Creative Rooms opened", format: "int",
    hint: "Rooms (collaborative projects, including those opened as Communities) created in the window.",
    sql: q(`SELECT count(*) FILTER (WHERE pr.created_at >= p.s AND pr.created_at < p.e)::numeric AS value,
       count(*) FILTER (WHERE pr.created_at >= p.ps AND pr.created_at < p.s)::numeric AS prev
FROM public.projects pr, p
WHERE pr.created_at >= p.ps AND pr.created_at < p.e`),
  },
  {
    kind: "breakdown", id: "communities-by-privacy", section: "product", label: "Communities by privacy", format: "int",
    hint: "Rooms opened as Communities (not archived) at the window end, by Public, Unlisted or Private.",
    sql: q(`SELECT initcap(pr.community_privacy) AS label, count(*)::numeric AS value
FROM public.projects pr, p
WHERE pr.community_privacy IS NOT NULL AND pr.status <> 'archived' AND pr.created_at < p.e
GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 12`),
  },
  {
    kind: "stat", id: "huddles-started", section: "product", label: "Huddles started", format: "int",
    hint: "Live Huddles opened in the window.",
    sql: q(`SELECT count(*) FILTER (WHERE h.started_at >= p.s AND h.started_at < p.e)::numeric AS value,
       count(*) FILTER (WHERE h.started_at >= p.ps AND h.started_at < p.s)::numeric AS prev
FROM public.huddles h, p
WHERE h.started_at >= p.ps AND h.started_at < p.e`),
  },
  {
    kind: "series", id: "pulse-activity", section: "product", label: "Pulse & Communities: topics and replies per day", format: "int", stacked: true, style: "bars",
    hint: "Open conversations started and replies posted (removed and deleted ones excluded). Community topics are open conversations too.",
    sql: q(`SELECT ${day("o.created_at")} AS day, count(*)::numeric AS value, 'Topics' AS series
FROM public.open_conversations o, p
WHERE o.removed_at IS NULL AND o.created_at >= p.s AND o.created_at < p.e
GROUP BY 1
UNION ALL
SELECT ${day("r.created_at")}, count(*)::numeric, 'Replies'
FROM public.open_conversation_replies r, p
WHERE r.deleted_at IS NULL AND r.removed_at IS NULL AND r.created_at >= p.s AND r.created_at < p.e
GROUP BY 1
ORDER BY 1, 3`),
  },
  {
    kind: "stat", id: "suggestion-acceptance", section: "product", label: "CreativeMind suggestions accepted", format: "pct",
    hint: "Of suggestions created in the window that the creator has answered, the share accepted: approval requests, DejaVu suggestions, Moment connections used, and context candidates imported. Unanswered and expired ones are left out. Answered approval requests are purged after 90 days, so very long windows undercount.",
    sql: q(
      `SELECT round(100.0 * count(*) FILTER (WHERE sg.ts >= p.s AND sg.ts < p.e AND sg.accepted)
       / nullif(count(*) FILTER (WHERE sg.ts >= p.s AND sg.ts < p.e), 0), 1)::numeric AS value,
       round(100.0 * count(*) FILTER (WHERE sg.ts >= p.ps AND sg.ts < p.s AND sg.accepted)
       / nullif(count(*) FILTER (WHERE sg.ts >= p.ps AND sg.ts < p.s), 0), 1)::numeric AS prev
FROM sg, p`,
      `sg AS (
  SELECT created_at AS ts, (status IN ('approved', 'executed')) AS accepted FROM public.ai_proposals
    WHERE status IN ('approved', 'executed', 'rejected') AND created_at >= $3::timestamptz AND created_at < $2::timestamptz
  UNION ALL
  SELECT created_at, (status = 'accepted') FROM public.dejavu_suggestions
    WHERE status IN ('accepted', 'dismissed') AND created_at >= $3::timestamptz AND created_at < $2::timestamptz
  UNION ALL
  SELECT created_at, (status = 'used') FROM public.moment_connections
    WHERE status IN ('used', 'dismissed') AND created_at >= $3::timestamptz AND created_at < $2::timestamptz
  UNION ALL
  SELECT created_at, (state = 'imported') FROM public.context_candidates
    WHERE state IN ('imported', 'dismissed') AND created_at >= $3::timestamptz AND created_at < $2::timestamptz
)`,
    ),
  },
  {
    kind: "breakdown", id: "contributions-by-kind", section: "product", label: "Credited contributions by kind", format: "int",
    hint: "Contributions recorded against Creations or Rooms in the window (attribution), not retracted: writing, editing, sound, design...",
    sql: q(`SELECT initcap(ct.kind) AS label, count(*)::numeric AS value
FROM public.contributions ct, p
WHERE ct.retracted_at IS NULL AND ct.created_at >= p.s AND ct.created_at < p.e
GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 12`),
  },
  {
    kind: "stat", id: "feedback-comments", section: "product", label: "Feedback comments from others", format: "int",
    hint: "Comments on a Creation written by someone other than its owner, in the window.",
    sql: q(`SELECT count(*) FILTER (WHERE ac.created_at >= p.s AND ac.created_at < p.e)::numeric AS value,
       count(*) FILTER (WHERE ac.created_at >= p.ps AND ac.created_at < p.s)::numeric AS prev
FROM public.artifact_comments ac
JOIN public.artifacts a ON a.id = ac.artifact_id AND a.creator_id <> ac.creator_id, p
WHERE ac.created_at >= p.ps AND ac.created_at < p.e`),
  },

  /* ------------------------------------------------------------------- revenue */
  {
    kind: "breakdown", id: "licences-by-mode", section: "revenue", label: "Active licences by mode", format: "int",
    hint: "Licences currently active, by mode (free, free with licence, paid non-exclusive, limited edition, exclusive). There are no subscriptions or plans in this product.",
    sql: q(`SELECT initcap(replace(l.mode, '_', ' ')) AS label, count(*)::numeric AS value
FROM public.licenses l, p
WHERE l.status = 'active'
GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 12`),
  },
  {
    kind: "stat", id: "paid-orders", section: "revenue", label: "Paid licence orders", format: "int",
    hint: "Licence checkouts paid in the window (including ones later refunded). Payments are provider-gated, so this can be zero.",
    sql: q(`SELECT count(*) FILTER (WHERE o.paid_at >= p.s AND o.paid_at < p.e)::numeric AS value,
       count(*) FILTER (WHERE o.paid_at >= p.ps AND o.paid_at < p.s)::numeric AS prev
FROM public.payment_orders o, p
WHERE o.status IN ('paid', 'partially_refunded', 'refunded') AND o.paid_at >= p.ps AND o.paid_at < p.e`),
  },
  {
    kind: "stat", id: "licence-sales-inr", section: "revenue", label: "Licence sales (INR, net of refunds)", format: "inr",
    hint: "Rupees paid by licensees in the window minus refunds recorded on those orders. This is what changed hands between creators and licensees, not the platform's own income.",
    sql: q(`-- NOTE: INR and USD have two decimal places, so minor units / 100 is major units.
SELECT coalesce(sum(greatest(o.amount_minor - o.refunded_minor, 0)) FILTER (WHERE o.paid_at >= p.s AND o.paid_at < p.e), 0)::numeric / 100 AS value,
       coalesce(sum(greatest(o.amount_minor - o.refunded_minor, 0)) FILTER (WHERE o.paid_at >= p.ps AND o.paid_at < p.s), 0)::numeric / 100 AS prev
FROM public.payment_orders o, p
WHERE o.currency = 'INR' AND o.status IN ('paid', 'partially_refunded', 'refunded') AND o.paid_at >= p.ps AND o.paid_at < p.e`),
  },
  {
    kind: "stat", id: "licence-sales-usd", section: "revenue", label: "Licence sales (USD, net of refunds)", format: "usd",
    hint: "Dollars paid by licensees in the window minus refunds recorded on those orders. Other currencies are not included.",
    sql: q(`SELECT coalesce(sum(greatest(o.amount_minor - o.refunded_minor, 0)) FILTER (WHERE o.paid_at >= p.s AND o.paid_at < p.e), 0)::numeric / 100 AS value,
       coalesce(sum(greatest(o.amount_minor - o.refunded_minor, 0)) FILTER (WHERE o.paid_at >= p.ps AND o.paid_at < p.s), 0)::numeric / 100 AS prev
FROM public.payment_orders o, p
WHERE o.currency = 'USD' AND o.status IN ('paid', 'partially_refunded', 'refunded') AND o.paid_at >= p.ps AND o.paid_at < p.e`),
  },

  /* ------------------------------------------------------------------------ ai */
  {
    kind: "series", id: "ai-runs-per-day", section: "ai", label: "AI runs per day, by kind", format: "int", stacked: true, style: "bars",
    hint: "CreativeMind runs by intent (question, create, refine, discover, transform, remember) plus image generations.",
    sql: q(`SELECT ${day("r.started_at")} AS day, count(*)::numeric AS value, initcap(r.intent) AS series
FROM public.ai_runs r, p
WHERE r.started_at >= p.s AND r.started_at < p.e
GROUP BY 1, 3
UNION ALL
SELECT ${day("g.created_at")}, count(*)::numeric, 'Images'
FROM public.image_generations g, p
WHERE g.created_at >= p.s AND g.created_at < p.e
GROUP BY 1
ORDER BY 1, 3`),
  },
  {
    kind: "stat", id: "ai-cost", section: "ai", label: "CreativeMind text cost (estimate)", format: "usd", good: "neutral",
    hint: "Sum of the cost estimated per text run in the window. Runs on a model without a price entry are recorded as zero, and image generation cost is not stored as an amount.",
    sql: q(`SELECT coalesce(sum(r.estimated_cost_usd) FILTER (WHERE r.started_at >= p.s AND r.started_at < p.e), 0)::numeric AS value,
       coalesce(sum(r.estimated_cost_usd) FILTER (WHERE r.started_at >= p.ps AND r.started_at < p.s), 0)::numeric AS prev
FROM public.ai_runs r, p
WHERE r.started_at >= p.ps AND r.started_at < p.e`),
  },
  {
    kind: "stat", id: "ai-failure-rate", section: "ai", label: "AI failure rate", format: "pct", good: "down",
    hint: "Failed text runs and image generations as a share of those that finished (succeeded or failed) in the window. Cancelled, queued and running ones are left out.",
    sql: q(
      `SELECT round(100.0 * count(*) FILTER (WHERE x.ts >= p.s AND x.ts < p.e AND x.failed)
       / nullif(count(*) FILTER (WHERE x.ts >= p.s AND x.ts < p.e), 0), 1)::numeric AS value,
       round(100.0 * count(*) FILTER (WHERE x.ts >= p.ps AND x.ts < p.s AND x.failed)
       / nullif(count(*) FILTER (WHERE x.ts >= p.ps AND x.ts < p.s), 0), 1)::numeric AS prev
FROM x, p`,
      `x AS (
  SELECT started_at AS ts, (status = 'failed') AS failed FROM public.ai_runs
    WHERE status IN ('succeeded', 'failed') AND started_at >= $3::timestamptz AND started_at < $2::timestamptz
  UNION ALL
  SELECT created_at, (status = 'failed') FROM public.image_generations
    WHERE status IN ('complete', 'partial', 'failed') AND created_at >= $3::timestamptz AND created_at < $2::timestamptz
)`,
    ),
  },
  {
    kind: "stat", id: "byok-adoption", section: "ai", label: "Bring-your-own-key adoption", format: "pct", snapshot: true,
    hint: "Creators who have saved their own AI provider key (not marked invalid), as a share of all creators at the window end.",
    sql: q(`SELECT round(100.0 * (SELECT count(DISTINCT k.creator_id) FROM public.creator_ai_keys k WHERE k.status <> 'invalid' AND k.created_at < p.e)
       / nullif((SELECT count(*) FROM public.creators c WHERE c.created_at < p.e), 0), 1)::numeric AS value
FROM p`),
  },

  /* -------------------------------------------------------------------- health */
  {
    kind: "stat", id: "publishing-stuck", section: "health", label: "Publications failed or stuck", format: "int", good: "down", snapshot: true,
    hint: "Publications that failed in the last 30 days, plus any still 'publishing' after an hour. Right now, not window-bound.",
    sql: q(`SELECT count(*)::numeric AS value
FROM public.publications pb, p
WHERE (pb.status = 'failed' AND pb.updated_at >= p.ref - interval '30 days')
   OR (pb.status = 'publishing' AND pb.updated_at < p.ref - interval '1 hour')`),
  },
  {
    kind: "stat", id: "jobs-stuck", section: "health", label: "Background jobs dead or overdue", format: "int", good: "down", snapshot: true,
    hint: "Jobs that ran out of attempts, or are waiting or running more than an hour past their time. Finished and dead jobs are purged after 30 days.",
    sql: q(`SELECT count(*)::numeric AS value
FROM public.jobs j, p
WHERE j.status = 'dead'
   OR (j.status IN ('pending', 'failed') AND j.run_after < p.ref - interval '1 hour')
   OR (j.status = 'running' AND j.updated_at < p.ref - interval '1 hour')`),
  },
  {
    kind: "stat", id: "moderation-open", section: "health", label: "Open moderation reports", format: "int", good: "down", snapshot: true,
    hint: "Reports from creators that are still open or under review. Needs a moderator.",
    sql: q(`SELECT count(*)::numeric AS value FROM public.moderation_reports mr, p WHERE mr.status IN ('open', 'reviewing')`),
  },
  {
    kind: "stat", id: "privacy-requests-due", section: "health", label: "Privacy requests due within 7 days or overdue", format: "int", good: "down", snapshot: true,
    hint: "Open data-rights requests (access, erasure, correction...) whose 30-day deadline is within a week or already passed. Needs the founder.",
    sql: q(`SELECT count(*)::numeric AS value
FROM public.privacy_requests pr, p
WHERE pr.status IN ('received', 'in_progress') AND pr.due_at < p.ref + interval '7 days'`),
  },
];

export const wondercreator: AppDashboard = {
  slug: "wondercreator",
  envVar: "WONDERCREATOR_DATABASE_URL",
  focus: "Are new creators getting from a first captured material to a published piece, and coming back the week after?",
  activeDefinition:
    "A creator is active when they did at least one deliberate thing: captured a material, made a Creation or saved a version themselves, talked to CreativeMind or ran a generation, posted or replied in Scrapbook, Pulse, a Community, a Room or a direct message, joined a Huddle, or commented on a Creation. Opening the app or reading is not counted, because the product keeps no visit history.",
  metrics,
};
