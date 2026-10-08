-- =====================================================================================
-- WonderJobs: least-privilege, READ-ONLY role for the WonderApps founder dashboard
-- =====================================================================================
--
-- Run ONCE, in the WonderJobs Supabase project (SQL editor, as the `postgres` role -- the
-- role that owns the `wonderjobs` tables). Safe to re-run: every statement is idempotent,
-- and a re-run first revokes everything the role had and then grants exactly what is below.
--
-- BEFORE YOU RUN IT: replace '<<set-a-long-random-password>>' (one place, in section 1)
-- with a long random password (`openssl rand -base64 36`). The script refuses to create the
-- role while the placeholder is still there. Then build the connection string from the
-- Supabase "Connect" page (use the pooler host; the user is `wonderapps_dashboard.<project-ref>`)
-- and put it in the WonderApps environment as WONDERJOBS_DATABASE_URL.
--
-- WHAT THE ROLE CAN DO
--   * LOGIN only. NOSUPERUSER, NOBYPASSRLS, no CREATEDB / CREATEROLE / REPLICATION.
--   * default_transaction_read_only = on, statement_timeout = 8s,
--     idle_in_transaction_session_timeout = 10s, lock_timeout = 2s, 6 connections at most.
--   * It has NO privilege on `wonderjobs.app_state`, `wonderjobs.tenants`, `contact_messages`'
--     name/email/message columns, `push_subscriptions.endpoint/p256dh/auth`,
--     `ai_provider_secrets.ciphertext/masked`, `jobslake_credentials`, `jobslake_opportunities`,
--     `auth.*`, or anything in `public`. It cannot execute `put_state` or the cron helpers.
--
-- WHY VIEWS
--   WonderJobs keeps almost all product state as one JSON document per account and store in
--   `wonderjobs.app_state.state` (Career Profile with name/skills/work history, applications with
--   drafted letters, runs with search text, ...). A column-level GRANT on that column would
--   expose every candidate's profile and documents, so the role is NOT granted it. Instead, this
--   script creates a private schema `wonderapps_dashboard` whose views run with the OWNER's
--   rights (Postgres default; `security_invoker` is off), read the JSON, and emit only
--   (opaque account id, timestamp, enum-valued category, number) rows. Every text value is
--   passed through an allow-list (`j_pick`) so free text can never leak, even by mistake.
--   Flat tables that carry no personal data are read with plain column-level grants.
--   The views must be created by a role that bypasses RLS on these tables (the table owner
--   does, since RLS is not FORCEd); section 0 checks this.
--
-- ASSUMPTIONS A FOUNDER SHOULD KNOW (also noted as -- NOTE in the queries)
--   * An "account" is a `wonderjobs.tenants` row whose id is a UUID (a Supabase Auth user).
--     Legacy/no-auth cookie tenants (`u_...`) are ignored. The row exists once the account has
--     synced state at least once.
--   * To keep your own / test accounts out of every number, add their tenant id (the user's
--     auth id) to wonderapps_dashboard.excluded_accounts (example at the end of this file).
--   * The product has no billing, so there is no revenue data. `career.plan` is a flag that the
--     app never sets to 'pro'.
--   * The product keeps only recent history inside the JSON (last 40 workflow runs, last 500 AI
--     calls, last 20 saved resumes, last 300 'not for me' decisions, last 25 Apply sessions per
--     account), so counts for old windows are lower bounds.
-- =====================================================================================


-- -------------------------------------------------------------------------------------
-- 0. Preconditions
-- -------------------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('wonderjobs.app_state') IS NULL THEN
    RAISE EXCEPTION 'wonderjobs.app_state not found: run this in the WonderJobs database';
  END IF;
  IF NOT (
    pg_has_role(current_user, (SELECT relowner FROM pg_class WHERE oid = 'wonderjobs.app_state'::regclass), 'MEMBER')
    OR (SELECT rolbypassrls OR rolsuper FROM pg_roles WHERE rolname = current_user)
  ) THEN
    RAISE EXCEPTION 'Run this as the owner of the wonderjobs tables (postgres): the views must be able to read past row-level security';
  END IF;
END $$;


-- -------------------------------------------------------------------------------------
-- 1. The role
-- -------------------------------------------------------------------------------------
DO $$
DECLARE
  pw constant text := '<<set-a-long-random-password>>';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wonderapps_dashboard') THEN
    IF pw LIKE '<<%' THEN
      RAISE EXCEPTION 'Replace the password placeholder at the top of section 1 with a long random password, then run again';
    END IF;
    EXECUTE format(
      'CREATE ROLE wonderapps_dashboard LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT',
      pw);
  END IF;
END $$;

-- Re-assert the attributes on every run (also repairs a role someone loosened by hand).
-- To rotate the password later:  ALTER ROLE wonderapps_dashboard PASSWORD '<new password>';
ALTER ROLE wonderapps_dashboard LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT CONNECTION LIMIT 6;
ALTER ROLE wonderapps_dashboard SET default_transaction_read_only = on;
ALTER ROLE wonderapps_dashboard SET statement_timeout = '8s';
ALTER ROLE wonderapps_dashboard SET idle_in_transaction_session_timeout = '10s';
ALTER ROLE wonderapps_dashboard SET lock_timeout = '2s';
ALTER ROLE wonderapps_dashboard SET search_path = pg_catalog;


-- -------------------------------------------------------------------------------------
-- 2. Reset: take back anything this role was given before, so a re-run only ever narrows
-- -------------------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES    IN SCHEMA wonderjobs FROM wonderapps_dashboard;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA wonderjobs FROM wonderapps_dashboard;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA wonderjobs FROM wonderapps_dashboard;

CREATE SCHEMA IF NOT EXISTS wonderapps_dashboard;
REVOKE ALL ON SCHEMA wonderapps_dashboard FROM PUBLIC;
REVOKE ALL ON ALL TABLES    IN SCHEMA wonderapps_dashboard FROM wonderapps_dashboard;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA wonderapps_dashboard FROM wonderapps_dashboard;

GRANT USAGE ON SCHEMA wonderjobs          TO wonderapps_dashboard;  -- needed for the column grants in section 5
GRANT USAGE ON SCHEMA wonderapps_dashboard TO wonderapps_dashboard;  -- the views in section 4


-- -------------------------------------------------------------------------------------
-- 3. Helpers (owner-only; the role is not granted EXECUTE) and the exclusion list
-- -------------------------------------------------------------------------------------
-- Dashboard views never trust JSON: timestamps, numbers and enums are parsed defensively so one
-- malformed document cannot fail a query for every account.

-- A valid ISO-8601 timestamp (what JSON.stringify(new Date()) writes), else NULL.
CREATE OR REPLACE FUNCTION wonderapps_dashboard.j_ts(t text) RETURNS timestamptz
LANGUAGE sql STABLE AS $f$
  SELECT CASE WHEN t ~ '^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d' THEN t::timestamptz END
$f$;

-- A plain decimal number, else NULL.
CREATE OR REPLACE FUNCTION wonderapps_dashboard.j_num(t text) RETURNS numeric
LANGUAGE sql IMMUTABLE AS $f$
  SELECT CASE WHEN t ~ '^-?\d{1,15}(\.\d{1,12})?$' THEN t::numeric END
$f$;

-- The value only when it is one of the allowed enum members, else NULL. This is the allow-list
-- that keeps free text out of every view.
CREATE OR REPLACE FUNCTION wonderapps_dashboard.j_pick(t text, allowed text[]) RETURNS text
LANGUAGE sql IMMUTABLE AS $f$
  SELECT CASE WHEN t = ANY (allowed) THEN t END
$f$;

-- An object / array, or an empty one when the value is missing or of another type.
CREATE OR REPLACE FUNCTION wonderapps_dashboard.j_obj(j jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $f$
  SELECT CASE WHEN jsonb_typeof(j) = 'object' THEN j ELSE '{}'::jsonb END
$f$;

CREATE OR REPLACE FUNCTION wonderapps_dashboard.j_arr(j jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $f$
  SELECT CASE WHEN jsonb_typeof(j) = 'array' THEN j ELSE '[]'::jsonb END
$f$;

REVOKE ALL ON FUNCTION wonderapps_dashboard.j_ts(text), wonderapps_dashboard.j_num(text), wonderapps_dashboard.j_pick(text, text[]),
                       wonderapps_dashboard.j_obj(jsonb), wonderapps_dashboard.j_arr(jsonb) FROM PUBLIC;

-- Accounts the dashboard must ignore (the founder's own, QA, demo). Filled by hand; never exposed
-- to the role directly -- only through `accounts` below.
CREATE TABLE IF NOT EXISTS wonderapps_dashboard.excluded_accounts (
  tenant_id text PRIMARY KEY,
  note      text,
  added_at  timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON wonderapps_dashboard.excluded_accounts FROM PUBLIC;


-- -------------------------------------------------------------------------------------
-- 4. Views (re-created on every run; dropped first so a changed column list cannot break a re-run)
-- -------------------------------------------------------------------------------------
DROP VIEW IF EXISTS wonderapps_dashboard.activity_events  CASCADE;
DROP VIEW IF EXISTS wonderapps_dashboard.apply_session_facts CASCADE;
DROP VIEW IF EXISTS wonderapps_dashboard.ai_usage_facts   CASCADE;
DROP VIEW IF EXISTS wonderapps_dashboard.career_industries CASCADE;
DROP VIEW IF EXISTS wonderapps_dashboard.career_facts     CASCADE;
DROP VIEW IF EXISTS wonderapps_dashboard.resume_facts     CASCADE;
DROP VIEW IF EXISTS wonderapps_dashboard.rejection_facts  CASCADE;
DROP VIEW IF EXISTS wonderapps_dashboard.application_events CASCADE;
DROP VIEW IF EXISTS wonderapps_dashboard.application_facts CASCADE;
DROP VIEW IF EXISTS wonderapps_dashboard.schedule_facts   CASCADE;
DROP VIEW IF EXISTS wonderapps_dashboard.run_facts        CASCADE;
DROP VIEW IF EXISTS wonderapps_dashboard.docs             CASCADE;
DROP VIEW IF EXISTS wonderapps_dashboard.accounts         CASCADE;

-- Real accounts: Supabase Auth users (UUID tenant ids) minus the exclusion list.
CREATE VIEW wonderapps_dashboard.accounts AS
SELECT t.id AS tenant_id, t.created_at
FROM wonderjobs.tenants t
WHERE t.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND NOT EXISTS (SELECT 1 FROM wonderapps_dashboard.excluded_accounts x WHERE x.tenant_id = t.id);

-- INTERNAL (not granted): one row per account and store with the store's data. Client stores are
-- persisted as {"state": {...}, "version": n}; the server-owned `wj.jobsapply` document is stored bare.
CREATE VIEW wonderapps_dashboard.docs AS
SELECT s.tenant_id, s.store,
       CASE WHEN s.store = 'wj.jobsapply' THEN wonderapps_dashboard.j_obj(s.state)
            ELSE wonderapps_dashboard.j_obj(s.state -> 'state') END AS d
FROM wonderjobs.app_state s
JOIN wonderapps_dashboard.accounts a ON a.tenant_id = s.tenant_id;

-- One row per retained workflow run (search). Counts and enums only: no query text, locations or goal.
CREATE VIEW wonderapps_dashboard.run_facts AS
SELECT d.tenant_id,
       wonderapps_dashboard.j_pick(r.value ->> 'trigger', ARRAY['manual','schedule']) AS trigger,
       wonderapps_dashboard.j_pick(r.value ->> 'status', ARRAY['PENDING','RUNNING','WAITING_FOR_USER','PAUSED','STOPPING','STOPPED','COMPLETED','COMPLETED_WITH_WARNINGS','FAILED','CANCELLED']) AS status,
       wonderapps_dashboard.j_ts(r.value ->> 'createdAt')   AS created_at,
       wonderapps_dashboard.j_ts(r.value ->> 'completedAt') AS completed_at,
       (r.value ->> 'silent') = 'true' AS silent,
       wonderapps_dashboard.j_pick(r.value #>> '{config,provider,provider}', ARRAY['wonderjobs','anthropic','openai','gemini']) AS ai_provider,
       wonderapps_dashboard.j_pick(r.value #>> '{config,provider,billing}', ARRAY['platform','byok']) AS ai_billing,
       wonderapps_dashboard.j_pick(r.value #>> '{config,automationLevel}', ARRAY['assist','guided','autonomous','continuous']) AS automation_level,
       wonderapps_dashboard.j_num(r.value #>> '{summary,jobsDiscovered}')        AS jobs_discovered,
       wonderapps_dashboard.j_num(r.value #>> '{summary,jobsRetained}')          AS jobs_retained,
       wonderapps_dashboard.j_num(r.value #>> '{summary,strongMatches}')         AS strong_matches,
       wonderapps_dashboard.j_num(r.value #>> '{summary,applicationsPrepared}')  AS applications_prepared,
       wonderapps_dashboard.j_num(r.value #>> '{summary,errors}')                AS errors
FROM wonderapps_dashboard.docs d
CROSS JOIN LATERAL jsonb_each(wonderapps_dashboard.j_obj(d.d -> 'runs')) r
WHERE d.store = 'wj.workflow' AND jsonb_typeof(r.value) = 'object';

-- One row per saved search schedule. No name, query or time of day.
CREATE VIEW wonderapps_dashboard.schedule_facts AS
SELECT d.tenant_id,
       (s.value ->> 'enabled') = 'true' AS enabled,
       wonderapps_dashboard.j_pick(s.value ->> 'trigger', ARRAY['schedule','manual','event']) AS trigger,
       wonderapps_dashboard.j_pick(s.value ->> 'frequency', ARRAY['daily','weekdays','weekly','monthly']) AS frequency,
       wonderapps_dashboard.j_ts(s.value ->> 'createdAt') AS created_at,
       wonderapps_dashboard.j_ts(s.value ->> 'lastRunAt') AS last_run_at
FROM wonderapps_dashboard.docs d
CROSS JOIN LATERAL jsonb_each(wonderapps_dashboard.j_obj(d.d -> 'schedules')) s
WHERE d.store = 'wj.workflow' AND jsonb_typeof(s.value) = 'object';

-- One row per application in the candidate's pipeline. Stage, dates and which drafts exist; never the job, employer or draft text.
CREATE VIEW wonderapps_dashboard.application_facts AS
SELECT d.tenant_id,
       COALESCE(wonderapps_dashboard.j_pick(a.value ->> 'status', ARRAY['saved','preparing','ready_for_review','submitted','under_review','interview','rejected','withdrawn','offer','unknown']), 'unknown') AS status,
       wonderapps_dashboard.j_ts(a.value ->> 'createdAt') AS created_at,
       wonderapps_dashboard.j_ts(a.value ->> 'appliedAt') AS applied_at,
       EXISTS (SELECT 1 FROM jsonb_array_elements(wonderapps_dashboard.j_arr(a.value -> 'artifacts')) x WHERE x ->> 'type' = 'resume')       AS has_resume,
       EXISTS (SELECT 1 FROM jsonb_array_elements(wonderapps_dashboard.j_arr(a.value -> 'artifacts')) x WHERE x ->> 'type' = 'cover_letter') AS has_cover_letter,
       EXISTS (SELECT 1 FROM jsonb_array_elements(wonderapps_dashboard.j_arr(a.value -> 'artifacts')) x WHERE x ->> 'type' = 'answers')      AS has_answers,
       EXISTS (SELECT 1 FROM jsonb_array_elements(wonderapps_dashboard.j_arr(a.value -> 'artifacts')) x,
                             jsonb_array_elements(wonderapps_dashboard.j_arr(x -> 'versions')) v
                WHERE v ->> 'provenance' IN ('AI_GENERATED','USER_MODIFIED')) AS has_ai_draft,
       (SELECT count(*) FROM jsonb_array_elements(wonderapps_dashboard.j_arr(a.value -> 'followUps')) f
         WHERE f ->> 'done' IS DISTINCT FROM 'true')::int AS open_follow_ups,
       (SELECT count(*) FROM jsonb_array_elements(wonderapps_dashboard.j_arr(a.value -> 'followUps')) f
         WHERE f ->> 'done' IS DISTINCT FROM 'true' AND wonderapps_dashboard.j_ts(f ->> 'dueAt') < now())::int AS overdue_follow_ups
FROM wonderapps_dashboard.docs d
CROSS JOIN LATERAL jsonb_each(wonderapps_dashboard.j_obj(d.d -> 'applications')) a
WHERE d.store = 'wj.applications' AND jsonb_typeof(a.value) = 'object';

-- One row per pipeline event (type and time only: no title or detail text).
CREATE VIEW wonderapps_dashboard.application_events AS
SELECT d.tenant_id,
       wonderapps_dashboard.j_pick(e ->> 'type', ARRAY['discovered','saved','prepared','submitted','follow_up','recruiter_response','interview','outcome','note']) AS type,
       wonderapps_dashboard.j_ts(e ->> 'at') AS at
FROM wonderapps_dashboard.docs d
CROSS JOIN LATERAL jsonb_each(wonderapps_dashboard.j_obj(d.d -> 'applications')) a
CROSS JOIN LATERAL jsonb_array_elements(wonderapps_dashboard.j_arr(a.value -> 'events')) e
WHERE d.store = 'wj.applications';

-- "Not for me" decisions: when, and the reason the candidate picked from a fixed list.
CREATE VIEW wonderapps_dashboard.rejection_facts AS
SELECT d.tenant_id,
       wonderapps_dashboard.j_ts(r ->> 'at') AS at,
       COALESCE(wonderapps_dashboard.j_pick(r ->> 'reason', ARRAY['too_junior','too_senior','wrong_industry','wrong_location','wrong_work_mode','compensation','skills_mismatch','not_interested','other']), 'none') AS reason
FROM wonderapps_dashboard.docs d
CROSS JOIN LATERAL jsonb_array_elements(wonderapps_dashboard.j_arr(d.d -> 'rejectionHistory')) r
WHERE d.store = 'wj.career';

-- Generated resumes (Resume Studio): template family, page count, whether tailored to a job. Never the document.
CREATE VIEW wonderapps_dashboard.resume_facts AS
SELECT d.tenant_id,
       wonderapps_dashboard.j_pick(regexp_replace(COALESCE(r ->> 'templateId', ''), '-v\d+$', ''),
         ARRAY['executive','modern-minimal','technical','classic-ats','leadership','career-shift','academic','creative-modern']) AS template,
       wonderapps_dashboard.j_ts(r ->> 'createdAt') AS created_at,
       wonderapps_dashboard.j_num(r ->> 'pageCount') AS page_count,
       jsonb_typeof(r -> 'target') = 'object' AS tailored_to_job
FROM wonderapps_dashboard.docs d
CROSS JOIN LATERAL jsonb_array_elements(wonderapps_dashboard.j_arr(d.d -> 'savedResumes')) r
WHERE d.store = 'wj.career';

-- One row per account: how far Career setup got. Booleans, a count and enums; no name, headline, goal or skills.
CREATE VIEW wonderapps_dashboard.career_facts AS
SELECT d.tenant_id,
       (d.d ->> 'onboarded') = 'true' AS onboarded,
       COALESCE(wonderapps_dashboard.j_pick(d.d ->> 'plan', ARRAY['free','pro']), 'free') AS plan,
       length(btrim(COALESCE(d.d #>> '{dna,careerGoal}', ''))) > 0 AS has_goal,
       jsonb_array_length(wonderapps_dashboard.j_arr(d.d #> '{dna,skills}'))::int AS skills_count,
       wonderapps_dashboard.j_pick(d.d #>> '{dna,seniority}', ARRAY['junior','mid','senior','lead','director']) AS seniority,
       jsonb_array_length(wonderapps_dashboard.j_arr(d.d #> '{dna,history,experience}')) > 0 AS has_work_history,
       (EXISTS (SELECT 1 FROM jsonb_array_elements(wonderapps_dashboard.j_arr(d.d #> '{dna,history,experience}')) x WHERE x ->> 'provenance' = 'RESUME_IMPORTED')
        OR EXISTS (SELECT 1 FROM jsonb_array_elements(wonderapps_dashboard.j_arr(d.d #> '{dna,history,education}')) x WHERE x ->> 'provenance' = 'RESUME_IMPORTED')) AS imported_resume,
       jsonb_array_length(wonderapps_dashboard.j_arr(d.d -> 'savedResumes'))::int AS saved_resumes
FROM wonderapps_dashboard.docs d
WHERE d.store = 'wj.career';

-- Target industries, restricted to the product's fixed list (anything else typed is dropped).
CREATE VIEW wonderapps_dashboard.career_industries AS
SELECT d.tenant_id, i AS industry
FROM wonderapps_dashboard.docs d
CROSS JOIN LATERAL jsonb_array_elements_text(wonderapps_dashboard.j_arr(d.d #> '{dna,industries}')) i
WHERE d.store = 'wj.career'
  AND i = ANY (ARRAY['Technology','Fintech','Consumer','E-commerce','Mobility','Education','Gaming','Travel','Telecom','Healthcare','Media']);

-- One row per recorded AI call (the browser records these; platform-billed calls have no cost).
CREATE VIEW wonderapps_dashboard.ai_usage_facts AS
SELECT d.tenant_id,
       wonderapps_dashboard.j_ts(u ->> 'at') AS at,
       wonderapps_dashboard.j_pick(u ->> 'provider', ARRAY['wonderjobs','anthropic','openai','gemini']) AS provider,
       CASE WHEN u ->> 'model' ~ '^[A-Za-z0-9._:-]{1,64}$' THEN u ->> 'model' END AS model,
       wonderapps_dashboard.j_pick(u ->> 'task', ARRAY['candidate_understanding','job_understanding','matching','ranking','resume_generation','cover_letter_generation','screening_answers','career_insights']) AS task,
       wonderapps_dashboard.j_num(u ->> 'inputTokens')  AS input_tokens,
       wonderapps_dashboard.j_num(u ->> 'outputTokens') AS output_tokens,
       wonderapps_dashboard.j_num(u ->> 'costUsd')      AS cost_usd
FROM wonderapps_dashboard.docs d
CROSS JOIN LATERAL jsonb_array_elements(wonderapps_dashboard.j_arr(d.d -> 'usage')) u
WHERE d.store = 'wj.ai';

-- One row per "Apply with Wonder" session (browser helper). Status, mode, failure code, the ATS family; never the job, company, URL or form values.
CREATE VIEW wonderapps_dashboard.apply_session_facts AS
SELECT d.tenant_id,
       wonderapps_dashboard.j_pick(s.value ->> 'status', ARRAY['DRAFT','PREFLIGHT','READY','STARTING','OPENING','AUTHENTICATION_REQUIRED','FORM_DETECTED','ANALYZING','FILLING','WAITING_FOR_USER','READY_TO_REVIEW','SUBMITTING','SUBMITTED','VERIFICATION','TRACKED','BLOCKED','PAUSED','CANCELLED','FAILED','PARTIAL','UNKNOWN']) AS status,
       wonderapps_dashboard.j_pick(s.value ->> 'mode', ARRAY['guided','assisted','fill']) AS mode,
       wonderapps_dashboard.j_pick(s.value ->> 'failure', ARRAY['AUTH_REQUIRED','MFA_REQUIRED','CAPTCHA_REQUIRED','FORM_NOT_FOUND','FIELD_AMBIGUOUS','FIELD_UNSUPPORTED','FILE_UPLOAD_FAILED','NAVIGATION_FAILED','DOMAIN_CHANGED','PAYMENT_REQUESTED','PORTAL_BLOCKED','ADAPTER_FAILURE','API_UNAUTHORIZED','API_VALIDATION_ERROR','DUPLICATE_APPLICATION','SUBMISSION_UNKNOWN','NETWORK_ERROR','USER_CANCELLED','SESSION_EXPIRED']) AS failure,
       COALESCE(wonderapps_dashboard.j_pick(COALESCE(s.value #>> '{form,provider}', s.value #>> '{destination,provider}'),
                ARRAY['greenhouse','lever','ashby','workday','smartrecruiters','workable','teamtailor','recruitee','personio']), 'other') AS ats,
       wonderapps_dashboard.j_ts(s.value ->> 'startedAt')   AS started_at,
       wonderapps_dashboard.j_ts(s.value ->> 'completedAt') AS completed_at,
       EXISTS (SELECT 1 FROM jsonb_array_elements(wonderapps_dashboard.j_arr(s.value -> 'audit')) x WHERE x ->> 'event' = 'HELPER_CONNECTED') AS helper_connected,
       jsonb_array_length(wonderapps_dashboard.j_arr(s.value -> 'interventions'))::int AS interventions
FROM wonderapps_dashboard.docs d
CROSS JOIN LATERAL jsonb_each(wonderapps_dashboard.j_obj(d.d -> 'sessions')) s
WHERE d.store = 'wj.jobsapply' AND jsonb_typeof(s.value) = 'object';

-- "Active" = an account did something itself (see activeDefinition in the dashboard module):
--   joined (first sync), ran a search, started or updated an application, recorded a "not for me"
--   decision, generated a resume, or started an Apply-with-Wonder session.
-- Scheduled (cron) runs, auto-saved jobs, notifications and plain state syncs do NOT count: the
-- server writes those without the person being there.
CREATE VIEW wonderapps_dashboard.activity_events AS
SELECT a.tenant_id, a.created_at AS at, 'joined'::text AS kind FROM wonderapps_dashboard.accounts a
UNION ALL SELECT r.tenant_id, r.created_at, 'search'            FROM wonderapps_dashboard.run_facts r WHERE r.trigger = 'manual' AND r.created_at IS NOT NULL
UNION ALL SELECT f.tenant_id, f.created_at, 'application'       FROM wonderapps_dashboard.application_facts f WHERE f.created_at IS NOT NULL
UNION ALL SELECT e.tenant_id, e.at,         'application_update' FROM wonderapps_dashboard.application_events e WHERE e.type IS DISTINCT FROM 'discovered' AND e.at IS NOT NULL
UNION ALL SELECT j.tenant_id, j.at,         'rejection'         FROM wonderapps_dashboard.rejection_facts j WHERE j.at IS NOT NULL
UNION ALL SELECT s.tenant_id, s.created_at, 'resume'            FROM wonderapps_dashboard.resume_facts s WHERE s.created_at IS NOT NULL
UNION ALL SELECT x.tenant_id, x.started_at, 'apply_session'     FROM wonderapps_dashboard.apply_session_facts x WHERE x.started_at IS NOT NULL;


-- -------------------------------------------------------------------------------------
-- 5. Grants
-- -------------------------------------------------------------------------------------
-- 5a. The views: SELECT only. (`docs` and `excluded_accounts` are deliberately NOT granted.)
GRANT SELECT ON
  wonderapps_dashboard.accounts,
  wonderapps_dashboard.run_facts,
  wonderapps_dashboard.schedule_facts,
  wonderapps_dashboard.application_facts,
  wonderapps_dashboard.application_events,
  wonderapps_dashboard.rejection_facts,
  wonderapps_dashboard.resume_facts,
  wonderapps_dashboard.career_facts,
  wonderapps_dashboard.career_industries,
  wonderapps_dashboard.ai_usage_facts,
  wonderapps_dashboard.apply_session_facts,
  wonderapps_dashboard.activity_events
TO wonderapps_dashboard;

-- 5b. Flat tables with no personal data: column-level SELECT on exactly the columns the dashboard
-- queries read, plus the read policy the role needs because these tables have row-level security
-- on and the role does not bypass it. A table that does not exist yet (the JobsLake tables come
-- from migration 0007) is skipped, and its dashboard metrics simply show "could not be read"
-- until the migration is applied and this script is run again.
--
--   contact_messages     created_at, topic, handled_at           NOT name, email, message, page, user_agent, tenant_id
--   action_audit         tenant_id, action_type, event, at       NOT action_id, detail (free text)
--   push_subscriptions   tenant_id, created_at, last_sent_at     NOT endpoint, p256dh, auth, user_agent, last_error
--   ai_provider_secrets  tenant_id, provider, connected_at       NOT ciphertext, masked, model, last_error
--   jobslake_runs        source_id, trigger, request_id, started_at, duration_ms, outcome, retrieved, valid,
--                        duplicates, relevant, strong, error_code NOT message (free text)
--   jobslake_sources     status, updated_at                      NOT id, record (config, may name an employer's board)
DO $$
DECLARE
  spec constant text[][] := ARRAY[
    ARRAY['contact_messages',    'created_at, topic, handled_at'],
    ARRAY['action_audit',        'tenant_id, action_type, event, at'],
    ARRAY['push_subscriptions',  'tenant_id, created_at, last_sent_at'],
    ARRAY['ai_provider_secrets', 'tenant_id, provider, connected_at'],
    ARRAY['jobslake_runs',       'source_id, trigger, request_id, started_at, duration_ms, outcome, retrieved, valid, duplicates, relevant, strong, error_code'],
    ARRAY['jobslake_sources',    'status, updated_at']
  ];
  i int;
  tbl text;
BEGIN
  FOR i IN 1 .. array_length(spec, 1) LOOP
    tbl := spec[i][1];
    IF to_regclass(format('wonderjobs.%I', tbl)) IS NULL THEN
      RAISE NOTICE 'wonderjobs.% does not exist yet: skipped', tbl;
      CONTINUE;
    END IF;
    EXECUTE format('GRANT SELECT (%s) ON wonderjobs.%I TO wonderapps_dashboard', spec[i][2], tbl);
    EXECUTE format('DROP POLICY IF EXISTS wonderapps_dashboard_read ON wonderjobs.%I', tbl);
    EXECUTE format('CREATE POLICY wonderapps_dashboard_read ON wonderjobs.%I FOR SELECT TO wonderapps_dashboard USING (true)', tbl);
  END LOOP;
END $$;

-- 5c. Tables read only through the views above need no role-level grant and no policy: the views
-- run as their owner. `wonderjobs.tenants` and `wonderjobs.app_state` are in that group, so the
-- role has no privilege on either (no policy is created on them for the role, on purpose).


-- -------------------------------------------------------------------------------------
-- 6. Optional: keep your own accounts out of every number
-- -------------------------------------------------------------------------------------
-- Find your account's id in Supabase > Authentication > Users (the "User UID"), then:
--
--   INSERT INTO wonderapps_dashboard.excluded_accounts (tenant_id, note)
--   VALUES ('00000000-0000-0000-0000-000000000000', 'founder test account')
--   ON CONFLICT (tenant_id) DO NOTHING;


-- -------------------------------------------------------------------------------------
-- 7. Smoke test (run as the dashboard role, e.g. from psql with the new connection string).
--    The first must work; the last four must fail with "permission denied".
-- -------------------------------------------------------------------------------------
--   SELECT count(*) FROM wonderapps_dashboard.accounts;
--   SELECT state FROM wonderjobs.app_state LIMIT 1;
--   SELECT email FROM wonderjobs.contact_messages LIMIT 1;
--   SELECT count(*) FROM wonderjobs.tenants;
--   INSERT INTO wonderjobs.tenants (id) VALUES ('x');
