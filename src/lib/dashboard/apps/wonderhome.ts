/**
 * WonderHome — founder dashboard metrics.
 *
 * Source of truth for every table/column used here: wonder-home/supabase/migrations (all 98 files,
 * applied in order). The database role that runs these is created by
 * docs/dashboard/wonderhome-readonly.sql, which grants SELECT on exactly the columns below and
 * nothing else — if you add a column to a query, add it to that file too.
 *
 * Vocabulary: a *user* is a signed-in person (a row in public.profiles); a *household* is the
 * account/tenant. Children, helpers and pets have no login and are never counted as users.
 *
 * The SQL strings are fixed at module load: the only fragments spliced in are the constants below
 * (ACT, notStaff). Every runtime value is a bound parameter ($1..$4); nothing user-controlled is
 * ever concatenated.
 */
import type { AppDashboard } from "../types";

/** Platform staff are never counted as customers. */
const notStaff = (col: string) => `NOT EXISTS (SELECT 1 FROM public.platform_admins a WHERE a.profile_id = ${col})`;

/**
 * `act(profile_id, ts)`: one row per deliberate thing a signed-in person did.
 * NOTE: the schema keeps no session/page-view log (auth.users.last_sign_in_at holds only the latest
 * login, so it cannot give a per-day series). These are the real, per-event, person-attributed
 * signals that exist:
 *   - a message to the assistant (HomeTalk, text or voice)      conversation_messages (role = 'member')
 *   - an item sent to HomeSend (upload, paste, link, WhatsApp)  home_send_items.created_by_member_id
 *   - opened or acted on a notification                          notifications.seen_at / acted_at
 *   - decided on an assistant proposal or approval               conversation_actions / approvals
 *   - a sensitive action that is audited (add member, role...)   audit_events.actor_profile_id
 * Members without a login (children, helpers) have no profile and are dropped by the join.
 * Pure sign-in (household_members.first_seen_at) is deliberately NOT activity.
 */
const ACT = `act AS (
  SELECT m.profile_id, t.ts
  FROM (
    SELECT s.member_id, msg.created_at AS ts
    FROM public.conversation_messages msg
    JOIN public.conversation_sessions s ON s.id = msg.session_id
    WHERE msg.role = 'member'
    UNION ALL SELECT created_by_member_id, created_at FROM public.home_send_items WHERE created_by_member_id IS NOT NULL
    UNION ALL SELECT recipient_member_id, seen_at FROM public.notifications WHERE seen_at IS NOT NULL
    UNION ALL SELECT recipient_member_id, acted_at FROM public.notifications WHERE acted_at IS NOT NULL
    UNION ALL SELECT decided_by_member_id, decided_at FROM public.conversation_actions WHERE decided_by_member_id IS NOT NULL AND decided_at IS NOT NULL
    UNION ALL SELECT approver_member_id, decided_at FROM public.approvals WHERE approver_member_id IS NOT NULL AND decided_at IS NOT NULL
  ) t
  JOIN public.household_members m ON m.id = t.member_id
  WHERE m.profile_id IS NOT NULL AND ${notStaff("m.profile_id")}
  UNION ALL
  SELECT e.actor_profile_id, e.created_at
  FROM public.audit_events e
  WHERE e.actor_profile_id IS NOT NULL AND ${notStaff("e.actor_profile_id")}
)`;

/** Areas of the product, as (area, household_id) rows: a household "uses" an area once it has a live record there. */
const AREAS = `areas AS (
  SELECT 'Assistant' AS area, household_id FROM public.conversation_sessions
  UNION ALL SELECT 'HomeSend', household_id FROM public.home_send_items
  UNION ALL SELECT 'Meals', household_id FROM public.meals
  UNION ALL SELECT 'Bills', household_id FROM public.obligations WHERE status <> 'cancelled'
  UNION ALL SELECT 'School', household_id FROM public.school_items
  UNION ALL SELECT 'Family events', household_id FROM public.family_events WHERE status <> 'cancelled'
  UNION ALL SELECT 'Pets', household_id FROM public.pets WHERE active
  UNION ALL SELECT 'Home maintenance', household_id FROM public.home_assets WHERE status = 'active'
  UNION ALL SELECT 'Groceries', household_id FROM public.consumables WHERE active
  UNION ALL SELECT 'Health', household_id FROM public.health_profiles
)`;

/** A paying subscription: the billing provider has reported terms (amount > 0) and it is in good standing. */
const PAYING = `s.provider IS NOT NULL AND s.amount > 0 AND s.status = 'active'`;

export const wonderhome: AppDashboard = {
  slug: "wonderhome",
  envVar: "WONDERHOME_DATABASE_URL",
  focus: "Are new households finishing setup and then coming back to talk to WonderHome and act on what it surfaces?",
  activeDefinition:
    "A person is active if, in the period, they sent a message to the assistant, sent an item to HomeSend, opened or acted on a notification, decided on an assistant proposal, or made an audited change. Signing in alone does not count, and children, helpers and platform staff are excluded.",
  metrics: [
    /* ------------------------------------------------------------------ audience */
    {
      kind: "stat", id: "total-users", section: "audience", label: "Total users", format: "int", snapshot: true, headline: true,
      hint: "Signed-in people (profiles) that exist today. Excludes platform staff; people who signed up but never created or joined a household have no profile yet.",
      sql: `SELECT count(*)::numeric AS value FROM public.profiles p WHERE ${notStaff("p.id")}`,
    },
    {
      kind: "stat", id: "total-households", section: "audience", label: "Households", format: "int", snapshot: true,
      hint: "Households (accounts) that are not closed.",
      sql: `SELECT count(*)::numeric AS value FROM public.households WHERE status <> 'closed'`,
    },
    {
      kind: "stat", id: "new-users", section: "audience", label: "New users", format: "int", headline: true,
      hint: "People whose profile was created in the window (first household created or invitation accepted).",
      sql: `SELECT count(*) FILTER (WHERE p.created_at >= $1::timestamptz AND p.created_at < $2::timestamptz)::numeric AS value,
                   count(*) FILTER (WHERE p.created_at >= $3::timestamptz AND p.created_at < $1::timestamptz)::numeric AS prev
            FROM public.profiles p
            WHERE p.created_at >= $3::timestamptz AND p.created_at < $2::timestamptz AND ${notStaff("p.id")}`,
    },
    {
      kind: "stat", id: "dau", section: "audience", label: "Daily active users", format: "int", snapshot: true,
      hint: "Distinct active people in the 24 hours before the window end; previous value is the same measure at the window start.",
      sql: `WITH ${ACT}
            SELECT count(DISTINCT profile_id) FILTER (WHERE ts >= $2::timestamptz - interval '1 day' AND ts < $2::timestamptz)::numeric AS value,
                   count(DISTINCT profile_id) FILTER (WHERE ts >= $1::timestamptz - interval '1 day' AND ts < $1::timestamptz)::numeric AS prev
            FROM act
            WHERE ts >= $1::timestamptz - interval '1 day' AND ts < $2::timestamptz`,
    },
    {
      kind: "stat", id: "wau", section: "audience", label: "Weekly active users", format: "int", snapshot: true, headline: true,
      hint: "Distinct active people in the 7 days before the window end; previous value is the same measure at the window start.",
      sql: `WITH ${ACT}
            SELECT count(DISTINCT profile_id) FILTER (WHERE ts >= $2::timestamptz - interval '7 days' AND ts < $2::timestamptz)::numeric AS value,
                   count(DISTINCT profile_id) FILTER (WHERE ts >= $1::timestamptz - interval '7 days' AND ts < $1::timestamptz)::numeric AS prev
            FROM act
            WHERE ts >= $1::timestamptz - interval '7 days' AND ts < $2::timestamptz`,
    },
    {
      kind: "stat", id: "mau", section: "audience", label: "Monthly active users", format: "int", snapshot: true, headline: true,
      hint: "Distinct active people in the 30 days before the window end; previous value is the same measure at the window start.",
      sql: `WITH ${ACT}
            SELECT count(DISTINCT profile_id) FILTER (WHERE ts >= $2::timestamptz - interval '30 days' AND ts < $2::timestamptz)::numeric AS value,
                   count(DISTINCT profile_id) FILTER (WHERE ts >= $1::timestamptz - interval '30 days' AND ts < $1::timestamptz)::numeric AS prev
            FROM act
            WHERE ts >= $1::timestamptz - interval '30 days' AND ts < $2::timestamptz`,
    },
    {
      kind: "stat", id: "stickiness", section: "audience", label: "Stickiness (DAU/MAU)", format: "pct", snapshot: true,
      hint: "Daily active users as a share of monthly active users, at the window end; previous value is the same ratio at the window start.",
      sql: `WITH ${ACT},
            agg AS (
              SELECT count(DISTINCT profile_id) FILTER (WHERE ts >= $2::timestamptz - interval '1 day' AND ts < $2::timestamptz) AS d1,
                     count(DISTINCT profile_id) FILTER (WHERE ts >= $2::timestamptz - interval '30 days' AND ts < $2::timestamptz) AS m1,
                     count(DISTINCT profile_id) FILTER (WHERE ts >= $1::timestamptz - interval '1 day' AND ts < $1::timestamptz) AS d0,
                     count(DISTINCT profile_id) FILTER (WHERE ts >= $1::timestamptz - interval '30 days' AND ts < $1::timestamptz) AS m0
              FROM act
              WHERE ts >= $1::timestamptz - interval '30 days' AND ts < $2::timestamptz
            )
            SELECT round(100.0 * d1 / NULLIF(m1, 0), 1)::numeric AS value,
                   round(100.0 * d0 / NULLIF(m0, 0), 1)::numeric AS prev
            FROM agg`,
    },
    {
      kind: "series", id: "signups-per-day", section: "audience", label: "Signups per day", format: "int", style: "bars",
      hint: "New profiles per day, in the dashboard time zone.",
      sql: `SELECT date_trunc('day', p.created_at AT TIME ZONE $4)::date AS day, count(*)::numeric AS value
            FROM public.profiles p
            WHERE p.created_at >= $1::timestamptz AND p.created_at < $2::timestamptz AND ${notStaff("p.id")}
            GROUP BY 1 ORDER BY 1`,
    },
    {
      kind: "funnel", id: "activation-funnel", section: "audience", label: "Activation funnel",
      hint: "People who signed up in the window: finished their household's setup, took a first action, and were active again 7+ days after signing up (people who signed up in the last 7 days cannot have returned yet).",
      // NOTE: "finished setup" = the person belongs to a household whose onboarding is 'completed'; someone invited into an
      // already-set-up household therefore counts as set up. "First action" and "returned" use the activity signal in ACT.
      sql: `WITH ${ACT},
            su AS (
              SELECT p.id, p.created_at FROM public.profiles p
              WHERE p.created_at >= $1::timestamptz AND p.created_at < $2::timestamptz AND ${notStaff("p.id")}
            ),
            setup AS (
              SELECT su.id, su.created_at FROM su
              WHERE EXISTS (
                SELECT 1 FROM public.household_members m
                JOIN public.household_onboarding o ON o.household_id = m.household_id AND o.status = 'completed'
                WHERE m.profile_id = su.id
              )
            ),
            acted AS (
              SELECT s.id, s.created_at FROM setup s
              WHERE EXISTS (SELECT 1 FROM act a WHERE a.profile_id = s.id AND a.ts >= s.created_at AND a.ts < $2::timestamptz)
            ),
            back AS (
              SELECT x.id FROM acted x
              WHERE EXISTS (SELECT 1 FROM act a WHERE a.profile_id = x.id AND a.ts >= x.created_at + interval '7 days' AND a.ts < $2::timestamptz)
            )
            SELECT 1 AS step, 'Signed up' AS label, count(*)::numeric AS value FROM su
            UNION ALL SELECT 2, 'Finished household setup', count(*)::numeric FROM setup
            UNION ALL SELECT 3, 'Took a first action', count(*)::numeric FROM acted
            UNION ALL SELECT 4, 'Active again a week later', count(*)::numeric FROM back`,
    },
    {
      kind: "cohort", id: "weekly-retention", section: "audience", label: "Weekly retention by signup week",
      hint: "Share of each weekly signup cohort (last 8 weeks, weeks start Monday in the dashboard time zone) that was active in week 0, 1, 2…",
      // NOTE: week 0 is below 100% by design: signing in alone is not activity.
      sql: `WITH ${ACT},
            cur AS (SELECT date_trunc('week', ($2::timestamptz - interval '1 second') AT TIME ZONE $4)::date AS wk),
            coh AS (
              SELECT p.id, date_trunc('week', p.created_at AT TIME ZONE $4)::date AS cohort
              FROM public.profiles p, cur
              WHERE ${notStaff("p.id")}
                AND (p.created_at AT TIME ZONE $4) >= (cur.wk - 49)::timestamp
                AND p.created_at < $2::timestamptz
            ),
            sizes AS (SELECT cohort, count(*) AS size FROM coh GROUP BY cohort),
            hits AS (
              SELECT c.cohort,
                     (date_trunc('week', a.ts AT TIME ZONE $4)::date - c.cohort) / 7 AS week,
                     count(DISTINCT c.id) AS active
              FROM coh c
              JOIN act a ON a.profile_id = c.id AND a.ts >= (c.cohort::timestamp AT TIME ZONE $4) AND a.ts < $2::timestamptz
              GROUP BY 1, 2
            )
            SELECT s.cohort, w.week::int AS week, coalesce(h.active, 0)::int AS active, s.size::int AS size
            FROM sizes s
            CROSS JOIN cur
            CROSS JOIN generate_series(0, 7) AS w(week)
            LEFT JOIN hits h ON h.cohort = s.cohort AND h.week = w.week
            WHERE s.cohort + w.week * 7 <= cur.wk
            ORDER BY s.cohort, w.week`,
    },
    {
      kind: "breakdown", id: "households-by-country", section: "audience", label: "Households by country", format: "int",
      hint: "Open households by the country (ISO code) chosen in setup; 'Not set' until a household picks one. Time zone is the only other location signal and is not shown.",
      sql: `SELECT coalesce(region, 'Not set') AS label, count(*)::numeric AS value
            FROM public.households WHERE status <> 'closed'
            GROUP BY 1 ORDER BY 2 DESC LIMIT 12`,
    },

    /* ---------------------------------------------------------------- engagement */
    {
      kind: "stat", id: "assistant-messages", section: "engagement", label: "Messages to the assistant", format: "int",
      hint: "Messages people sent to WonderHome's assistant (HomeTalk), typed or spoken. The assistant's own replies are not counted.",
      sql: `SELECT count(*) FILTER (WHERE msg.created_at >= $1::timestamptz AND msg.created_at < $2::timestamptz)::numeric AS value,
                   count(*) FILTER (WHERE msg.created_at >= $3::timestamptz AND msg.created_at < $1::timestamptz)::numeric AS prev
            FROM public.conversation_messages msg
            WHERE msg.role = 'member' AND msg.created_at >= $3::timestamptz AND msg.created_at < $2::timestamptz`,
    },
    {
      kind: "series", id: "assistant-messages-per-day", section: "engagement", label: "Assistant messages per day", format: "int", stacked: true, style: "bars",
      hint: "Messages people sent to the assistant, by whether the conversation was typed or voice.",
      sql: `SELECT date_trunc('day', msg.created_at AT TIME ZONE $4)::date AS day, s.channel AS series, count(*)::numeric AS value
            FROM public.conversation_messages msg
            JOIN public.conversation_sessions s ON s.id = msg.session_id
            WHERE msg.role = 'member' AND msg.created_at >= $1::timestamptz AND msg.created_at < $2::timestamptz
            GROUP BY 1, 2 ORDER BY 1, 2`,
    },
    {
      kind: "stat", id: "homesend-items", section: "engagement", label: "Items sent to HomeSend", format: "int",
      hint: "Photos, documents, pasted text, links, voice notes, emails and WhatsApp messages sent in for WonderHome to file.",
      sql: `SELECT count(*) FILTER (WHERE created_at >= $1::timestamptz AND created_at < $2::timestamptz)::numeric AS value,
                   count(*) FILTER (WHERE created_at >= $3::timestamptz AND created_at < $1::timestamptz)::numeric AS prev
            FROM public.home_send_items
            WHERE created_at >= $3::timestamptz AND created_at < $2::timestamptz`,
    },
    {
      kind: "series", id: "homesend-items-per-day", section: "engagement", label: "HomeSend items per day", format: "int", stacked: true, style: "bars",
      hint: "Items sent to HomeSend per day, by how they arrived (upload, pasted text, email, WhatsApp, link, voice note).",
      sql: `SELECT date_trunc('day', created_at AT TIME ZONE $4)::date AS day, source AS series, count(*)::numeric AS value
            FROM public.home_send_items
            WHERE created_at >= $1::timestamptz AND created_at < $2::timestamptz
            GROUP BY 1, 2 ORDER BY 1, 2`,
    },

    /* ------------------------------------------------------------------- product */
    {
      kind: "breakdown", id: "feature-adoption", section: "product", label: "Households using each area", format: "int",
      hint: "Open households with at least one live record in each area (assistant conversation, HomeSend item, meal, bill, school item, family event, active pet, home asset, grocery item, health space).",
      sql: `WITH ${AREAS}
            SELECT a.area AS label, count(DISTINCT a.household_id)::numeric AS value
            FROM areas a
            JOIN public.households h ON h.id = a.household_id AND h.status <> 'closed'
            GROUP BY 1 ORDER BY 2 DESC LIMIT 12`,
    },
    {
      kind: "breakdown", id: "household-depth", section: "product", label: "Depth of use per household", format: "int",
      hint: "Open households by how many product areas they use (0 = created but nothing added yet). See 'Households using each area' for the list of areas.",
      sql: `WITH ${AREAS},
            per AS (SELECT household_id, count(DISTINCT area) AS n FROM areas GROUP BY 1)
            SELECT coalesce(per.n, 0)::text || CASE WHEN coalesce(per.n, 0) = 1 THEN ' area' ELSE ' areas' END AS label,
                   count(*)::numeric AS value
            FROM public.households h
            LEFT JOIN per ON per.household_id = h.id
            WHERE h.status <> 'closed'
            GROUP BY coalesce(per.n, 0) ORDER BY coalesce(per.n, 0) LIMIT 12`,
    },
    {
      kind: "stat", id: "outcome-success-rate", section: "product", label: "Household outcomes met on time", format: "pct",
      hint: "Of the outcomes WonderHome tracks for households (bills paid, school work ready, groceries in…) that fell due in the window and are now decided, the share that were met rather than missed.",
      sql: `SELECT round(100.0 * count(*) FILTER (WHERE status = 'met' AND due_at >= $1::timestamptz AND due_at < $2::timestamptz)
                    / NULLIF(count(*) FILTER (WHERE status IN ('met', 'missed') AND due_at >= $1::timestamptz AND due_at < $2::timestamptz), 0), 1)::numeric AS value,
                   round(100.0 * count(*) FILTER (WHERE status = 'met' AND due_at >= $3::timestamptz AND due_at < $1::timestamptz)
                    / NULLIF(count(*) FILTER (WHERE status IN ('met', 'missed') AND due_at >= $3::timestamptz AND due_at < $1::timestamptz), 0), 1)::numeric AS prev
            FROM public.outcomes
            WHERE due_at >= $3::timestamptz AND due_at < $2::timestamptz`,
    },
    {
      kind: "series", id: "records-added-per-day", section: "product", label: "Records added per day", format: "int", stacked: true, style: "bars",
      hint: "New household records per day by area, added by people or the assistant. Bills, school items and events synced from a connected service are excluded.",
      sql: `WITH r AS (
              SELECT 'Meals' AS series, created_at FROM public.meals
              UNION ALL SELECT 'Bills', created_at FROM public.obligations WHERE integration_id IS NULL
              UNION ALL SELECT 'School', created_at FROM public.school_items WHERE integration_id IS NULL
              UNION ALL SELECT 'Family events', created_at FROM public.family_events WHERE integration_id IS NULL
              UNION ALL SELECT 'Pets', created_at FROM public.pets
              UNION ALL SELECT 'Home maintenance', created_at FROM public.home_assets
              UNION ALL SELECT 'Groceries', created_at FROM public.consumables
              UNION ALL SELECT 'Health appointments', created_at FROM public.health_appointments
            )
            SELECT date_trunc('day', created_at AT TIME ZONE $4)::date AS day, series, count(*)::numeric AS value
            FROM r
            WHERE created_at >= $1::timestamptz AND created_at < $2::timestamptz
            GROUP BY 1, 2 ORDER BY 1, 2`,
    },
    {
      kind: "funnel", id: "notification-funnel", section: "product", label: "Notifications: delivered, seen, acted on",
      hint: "Notifications created in the window. Each step includes everything beyond it (a notification acted on counts as seen and delivered).",
      sql: `SELECT 1 AS step, 'Created' AS label, count(*)::numeric AS value
            FROM public.notifications WHERE created_at >= $1::timestamptz AND created_at < $2::timestamptz
            UNION ALL
            SELECT 2, 'Delivered', count(*)::numeric
            FROM public.notifications
            WHERE created_at >= $1::timestamptz AND created_at < $2::timestamptz
              AND (delivered_at IS NOT NULL OR seen_at IS NOT NULL OR acted_at IS NOT NULL)
            UNION ALL
            SELECT 3, 'Seen', count(*)::numeric
            FROM public.notifications
            WHERE created_at >= $1::timestamptz AND created_at < $2::timestamptz
              AND (seen_at IS NOT NULL OR acted_at IS NOT NULL)
            UNION ALL
            SELECT 4, 'Acted on', count(*)::numeric
            FROM public.notifications
            WHERE created_at >= $1::timestamptz AND created_at < $2::timestamptz AND acted_at IS NOT NULL`,
    },

    /* ------------------------------------------------------------------- revenue */
    {
      kind: "breakdown", id: "plan-mix", section: "revenue", label: "Households by plan", format: "int",
      hint: "Open households by plan. A household with no subscription row is on Free. Pro and Max are currently free during early access unless billed, so this is not a paid count.",
      sql: `SELECT coalesce(s.plan_key, 'free') AS label, count(*)::numeric AS value
            FROM public.households h
            LEFT JOIN public.household_subscriptions s ON s.household_id = h.id
            WHERE h.status <> 'closed'
            GROUP BY 1 ORDER BY 2 DESC LIMIT 12`,
    },
    {
      kind: "stat", id: "paying-households", section: "revenue", label: "Paying households", format: "int", snapshot: true, headline: true,
      hint: "Open households whose subscription is active and billed by a payment provider (amount above zero), in any currency. Pro/Max households on free early access are not counted.",
      sql: `SELECT count(*)::numeric AS value
            FROM public.household_subscriptions s
            JOIN public.households h ON h.id = s.household_id AND h.status <> 'closed'
            WHERE ${PAYING}`,
    },
    {
      kind: "stat", id: "mrr-inr", section: "revenue", label: "MRR (INR)", format: "inr", snapshot: true, headline: true,
      hint: "Monthly recurring revenue from active, billed subscriptions in INR: monthly plans at their price, yearly plans at one twelfth. Major units (rupees). Other currencies are excluded.",
      // NOTE: household_subscriptions.amount is numeric(12,2) in major units (not paise); yearly prices are per year.
      sql: `SELECT coalesce(sum(CASE s.billing_interval WHEN 'year' THEN s.amount / 12 ELSE s.amount END), 0)::numeric AS value
            FROM public.household_subscriptions s
            JOIN public.households h ON h.id = s.household_id AND h.status <> 'closed'
            WHERE ${PAYING} AND s.currency = 'INR'`,
    },
    {
      kind: "stat", id: "arr-inr", section: "revenue", label: "ARR (INR)", format: "inr", snapshot: true,
      hint: "Twelve times the current INR MRR.",
      sql: `SELECT (12 * coalesce(sum(CASE s.billing_interval WHEN 'year' THEN s.amount / 12 ELSE s.amount END), 0))::numeric AS value
            FROM public.household_subscriptions s
            JOIN public.households h ON h.id = s.household_id AND h.status <> 'closed'
            WHERE ${PAYING} AND s.currency = 'INR'`,
    },
    {
      kind: "stat", id: "revenue-collected", section: "revenue", label: "Net cash collected (INR)", format: "inr",
      hint: "Successful INR payments received in the window, minus INR refunds completed in the window.",
      sql: `SELECT coalesce((SELECT sum(amount) FROM public.payments
                             WHERE currency = 'INR' AND status IN ('succeeded', 'refunded', 'partially_refunded')
                               AND paid_at >= $1::timestamptz AND paid_at < $2::timestamptz), 0)
                   - coalesce((SELECT sum(amount) FROM public.payment_refunds
                               WHERE currency = 'INR' AND status = 'succeeded'
                                 AND completed_at >= $1::timestamptz AND completed_at < $2::timestamptz), 0) AS value,
                   coalesce((SELECT sum(amount) FROM public.payments
                             WHERE currency = 'INR' AND status IN ('succeeded', 'refunded', 'partially_refunded')
                               AND paid_at >= $3::timestamptz AND paid_at < $1::timestamptz), 0)
                   - coalesce((SELECT sum(amount) FROM public.payment_refunds
                               WHERE currency = 'INR' AND status = 'succeeded'
                                 AND completed_at >= $3::timestamptz AND completed_at < $1::timestamptz), 0) AS prev`,
    },
    {
      kind: "stat", id: "new-paid-subscriptions", section: "revenue", label: "New paid subscriptions", format: "int",
      hint: "Subscriptions activated by a payment provider in the window (billing events that were applied).",
      sql: `SELECT count(*) FILTER (WHERE occurred_at >= $1::timestamptz AND occurred_at < $2::timestamptz)::numeric AS value,
                   count(*) FILTER (WHERE occurred_at >= $3::timestamptz AND occurred_at < $1::timestamptz)::numeric AS prev
            FROM public.billing_events
            WHERE event_type = 'subscription.activated' AND applied AND occurred_at >= $3::timestamptz AND occurred_at < $2::timestamptz`,
    },

    /* ------------------------------------------------------------------------ ai */
    {
      kind: "stat", id: "agent-runs", section: "ai", label: "Assistant task runs", format: "int",
      hint: "Multi-step tasks the assistant started on a household's behalf.",
      sql: `SELECT count(*) FILTER (WHERE started_at >= $1::timestamptz AND started_at < $2::timestamptz)::numeric AS value,
                   count(*) FILTER (WHERE started_at >= $3::timestamptz AND started_at < $1::timestamptz)::numeric AS prev
            FROM public.agent_runs
            WHERE started_at >= $3::timestamptz AND started_at < $2::timestamptz`,
    },
    {
      kind: "stat", id: "agent-failure-rate", section: "ai", label: "Task failure rate", format: "pct", good: "down",
      hint: "Of assistant task runs that finished in the window, the share that failed. Runs still running or waiting for approval are not counted.",
      sql: `SELECT round(100.0 * count(*) FILTER (WHERE status = 'failed' AND started_at >= $1::timestamptz AND started_at < $2::timestamptz)
                    / NULLIF(count(*) FILTER (WHERE status IN ('succeeded', 'failed') AND started_at >= $1::timestamptz AND started_at < $2::timestamptz), 0), 1)::numeric AS value,
                   round(100.0 * count(*) FILTER (WHERE status = 'failed' AND started_at >= $3::timestamptz AND started_at < $1::timestamptz)
                    / NULLIF(count(*) FILTER (WHERE status IN ('succeeded', 'failed') AND started_at >= $3::timestamptz AND started_at < $1::timestamptz), 0), 1)::numeric AS prev
            FROM public.agent_runs
            WHERE started_at >= $3::timestamptz AND started_at < $2::timestamptz`,
    },
    {
      kind: "series", id: "agent-runs-per-day", section: "ai", label: "Assistant task runs per day", format: "int", stacked: true, style: "bars",
      hint: "Task runs started per day, by current status.",
      sql: `SELECT date_trunc('day', started_at AT TIME ZONE $4)::date AS day, status AS series, count(*)::numeric AS value
            FROM public.agent_runs
            WHERE started_at >= $1::timestamptz AND started_at < $2::timestamptz
            GROUP BY 1, 2 ORDER BY 1, 2`,
    },
    {
      kind: "breakdown", id: "assistant-proposals", section: "ai", label: "What happened to assistant proposals", format: "int",
      hint: "Actions the assistant proposed or took in conversation during the window, by outcome (proposed, approved, rejected, executed, failed, expired).",
      sql: `SELECT approval_status AS label, count(*)::numeric AS value
            FROM public.conversation_actions
            WHERE created_at >= $1::timestamptz AND created_at < $2::timestamptz
            GROUP BY 1 ORDER BY 2 DESC LIMIT 12`,
    },
    {
      kind: "stat", id: "byok-households", section: "ai", label: "Households using their own AI key", format: "int", snapshot: true,
      hint: "Open households that have saved their own model key (bring-your-own-key). The key itself is never readable by this dashboard.",
      sql: `SELECT count(*)::numeric AS value
            FROM public.household_ai_credentials c
            JOIN public.households h ON h.id = c.household_id AND h.status <> 'closed'`,
    },

    /* -------------------------------------------------------------------- health */
    {
      kind: "stat", id: "jobs-backlog", section: "health", label: "Background jobs waiting too long", format: "int", good: "down", snapshot: true,
      hint: "Background jobs still pending more than 15 minutes after they were due, at the window end. Should be zero.",
      sql: `SELECT count(*)::numeric AS value
            FROM public.jobs
            WHERE status = 'pending' AND run_after < $2::timestamptz - interval '15 minutes'`,
    },
    {
      kind: "stat", id: "jobs-dead", section: "health", label: "Background jobs given up on", format: "int", good: "down",
      hint: "Jobs that exhausted their retries ('dead') in the window; each is work that never got done.",
      sql: `SELECT count(*) FILTER (WHERE updated_at >= $1::timestamptz AND updated_at < $2::timestamptz)::numeric AS value,
                   count(*) FILTER (WHERE updated_at >= $3::timestamptz AND updated_at < $1::timestamptz)::numeric AS prev
            FROM public.jobs
            WHERE status = 'dead' AND updated_at >= $3::timestamptz AND updated_at < $2::timestamptz`,
    },
    {
      kind: "stat", id: "undeliverable-notifications", section: "health", label: "Undeliverable notifications", format: "int", good: "down",
      hint: "Notification deliveries that failed in the window (push, email or WhatsApp refused or bounced).",
      sql: `SELECT count(*) FILTER (WHERE created_at >= $1::timestamptz AND created_at < $2::timestamptz)::numeric AS value,
                   count(*) FILTER (WHERE created_at >= $3::timestamptz AND created_at < $1::timestamptz)::numeric AS prev
            FROM public.notification_events
            WHERE event_type = 'delivery_failed' AND created_at >= $3::timestamptz AND created_at < $2::timestamptz`,
    },
    {
      kind: "stat", id: "integrations-unhealthy", section: "health", label: "Connected services in trouble", format: "int", good: "down", snapshot: true,
      hint: "Household connections (school, calendar, email, commerce…) currently degraded or in error.",
      sql: `SELECT count(*)::numeric AS value FROM public.integrations WHERE status IN ('degraded', 'error')`,
    },
    {
      kind: "stat", id: "privacy-requests-open", section: "health", label: "Privacy requests waiting", format: "int", good: "down", snapshot: true,
      hint: "Data export or deletion requests that are pending or ready but not yet completed. These have legal clocks; this is the number that needs the founder.",
      sql: `SELECT count(*)::numeric AS value FROM public.privacy_requests WHERE status IN ('pending', 'ready')`,
    },
  ],
};
