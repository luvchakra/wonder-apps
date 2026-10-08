-- =====================================================================================
-- WonderJobs: least-privilege, READ-ONLY role for the WonderApps founder dashboard
-- =====================================================================================
--
-- Run ONCE, in the WonderJobs Supabase project (SQL editor, as the `postgres` role -- the
-- role that owns the `wonderjobs` tables). Safe to re-run: every statement is idempotent,
-- and a re-run first revokes everything the role had and then grants exactly what is below.
-- Run it again after applying migration 0007 (JobsLake) so the JobsLake grants are added.
--
-- BEFORE YOU RUN IT: in section 1, replace the password placeholder (the text between the
-- angle brackets, brackets included) with a long random password (`openssl rand -base64 36`).
-- The script refuses to create the role while the placeholder is still there. Then build the
-- connection string from the Supabase "Connect" page (pooler host; the user is
-- `wonderapps_dashboard.<project-ref>`) and set it in WonderApps as WONDERJOBS_DATABASE_URL.
--
-- WHAT THE ROLE CAN DO
--   * LOGIN only. NOSUPERUSER, NOBYPASSRLS, no CREATEDB / CREATEROLE / REPLICATION.
--   * default_transaction_read_only = on, statement_timeout = 8s,
--     idle_in_transaction_session_timeout = 10s, lock_timeout = 2s, 6 connections at most.
--     (Those are defaults a session can switch off; the real guard is that the role holds no
--     privilege except SELECT, listed in section 5.)
--   * It has NO privilege on `wonderjobs.app_state`, `wonderjobs.tenants`, the name / email /
--     message columns of `contact_messages`, `push_subscriptions`, the key columns of
--     `ai_provider_secrets`, `jobslake_credentials`, `jobslake_opportunities`, `auth.*`, or
--     anything in `public`. It cannot execute `put_state` or the cron helper functions.
--
-- WHY VIEWS
--   WonderJobs keeps almost all product state as one JSON document per account and store in
--   `wonderjobs.app_state.state` (Career Profile with name / skills / work history, applications
--   with drafted letters, runs with search text, ...). A column-level GRANT on that column would
--   expose every candidate's profile and documents, so the role is NOT granted it. Instead this
--   script creates a private schema `wonderapps_dashboard` whose views run with the OWNER's
--   rights (the Postgres default; they are not security_invoker), read the JSON, and emit only
--   (opaque account id, timestamp, allow-listed category, number) rows. Every text value passes
--   through an allow-list (`j_pick`) so free text cannot leak even by mistake.
--   Flat tables that carry no personal data are read with plain column-level grants.
--   The views must be created by a role that can read past row-level security on these tables
--   (the table owner can, because RLS is not FORCEd); section 0 checks this.
--
-- ASSUMPTIONS A FOUNDER SHOULD KNOW (also noted as -- NOTE in the queries)
--   * An "account" is a `wonderjobs.tenants` row whose id is a UUID (a Supabase Auth user).
--     Legacy / no-auth cookie tenants (`u_...`) are ignored. The row appears when the account
--     first syncs state, so "signed up" means "first sync after sign-in".
--   * To keep your own / test accounts out of every number, add their tenant id (the user's
--     auth id) to wonderapps_dashboard.excluded_accounts (example in section 6). The schema has
--     no demo / test flag of its own (demo mode never syncs to the server).
--   * The product has no billing, so there is no revenue data. `career.plan` is a flag the app
--     never sets to 'pro'.
--   * The product keeps only recent history inside the JSON (latest 40 workflow runs, 500 AI
--     calls, 20 saved resumes, 300 "not for me" decisions, 25 Apply sessions per account), so
--     counts for old windows are lower bounds.
--   * Every metric that uses the JSON reads every account's documents (the dashboard caches results
--     for two minutes). That is comfortable for hundreds of accounts. If 8-second statement
--     timeouts start to appear as the user base grows into the thousands, turn the views in
--     section 4 into materialized views refreshed on a schedule.
--   * The documents are written by the candidates' browsers, so a user can only distort their own
--     account's numbers; malformed values are ignored rather than failing a query.
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

GRANT USAGE ON SCHEMA wonderjobs           TO wonderapps_dashboard;  -- for the column grants in 5b
GRANT USAGE ON SCHEMA wonderapps_dashboard TO wonderapps_dashboard;  -- for the views in 5a


-- -------------------------------------------------------------------------------------
-- 3. Helpers and the exclusion list
-- -------------------------------------------------------------------------------------
-- The views never trust JSON: timestamps, numbers and enums are parsed defensively so one
-- malformed document cannot fail a query for every account.

-- A valid ISO-8601 timestamp (what JSON.stringify(new Date()) writes), else NULL. The browser can write
-- any JSON into these documents, so an impossible date such as 2026-02-31 must give NULL, not an error.
CREATE OR REPLACE FUNCTION wonderapps_dashboard.j_ts(t text) RETURNS timestamptz
LANGUAGE plpgsql STABLE AS $f$
BEGIN
  IF t ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}' THEN
    RETURN t::timestamptz;
  END IF;
  RETURN NULL;
EXCEPTION WHEN others THEN
  RETURN NULL;
END
$f$;

-- A plain decimal number, else NULL.
CREATE OR REPLACE FUNCTION wonderapps_dashboard.j_num(t text) RETURNS numeric
LANGUAGE sql IMMUTABLE AS $f$
  SELECT CASE WHEN t ~ '^-?\d{1,15}(\.\d{1,12})?$' THEN t::numeric END
$f$;

-- The value only when it is one of the allowed enum members, else NULL. This allow-list is what
-- keeps free text out of every view.
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

-- These are pure functions (no table access). The role needs EXECUTE on them because Postgres checks
-- function privileges against the caller even when the call sits inside a view.
REVOKE ALL ON FUNCTION wonderapps_dashboard.j_ts(text), wonderapps_dashboard.j_num(text), wonderapps_dashboard.j_pick(text, text[]),
                       wonderapps_dashboard.j_obj(jsonb), wonderapps_dashboard.j_arr(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wonderapps_dashboard.j_ts(text), wonderapps_dashboard.j_num(text), wonderapps_dashboard.j_pick(text, text[]),
                          wonderapps_dashboard.j_obj(jsonb), wonderapps_dashboard.j_arr(jsonb) TO wonderapps_dashboard;

-- Accounts the dashboard must ignore (the founder's own, QA, demo). Filled by hand; never exposed
-- to the role directly, only through `accounts` below.
CREATE TABLE IF NOT EXISTS wonderapps_dashboard.excluded_accounts (
  tenant_id text PRIMARY KEY,
  note      text,
  added_at  timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON wonderapps_dashboard.excluded_accounts FROM PUBLIC;


-- -------------------------------------------------------------------------------------
-- 4. Views (re-created on every run; dropped first so a changed column list cannot break a re-run)
-- -------------------------------------------------------------------------------------
DROP VIEW IF EXISTS wonderapps_dashboard.activity_events     CASCADE;
DROP VIEW IF EXISTS wonderapps_dashboard.apply_session_facts CASCADE;
DROP VIEW IF EXISTS wonderapps_dashboard.ai_usage_facts      CASCADE;
DROP VIEW IF EXISTS wonderapps_dashboard.career_facts        CASCADE;
DROP VIEW IF EXISTS wonderapps_dashboard.resume_facts        CASCADE;
DROP VIEW IF EXISTS wonderapps_dashboard.rejection_facts     CASCADE;
DROP VIEW IF EXISTS wonderapps_dashboard.application_events  CASCADE;
DROP VIEW IF EXISTS wonderapps_dashboard.application_facts   CASCADE;
DROP VIEW IF EXISTS wonderapps_dashboard.schedule_facts      CASCADE;
DROP VIEW IF EXISTS wonderapps_dashboard.run_facts           CASCADE;
DROP VIEW IF EXISTS wonderapps_dashboard.docs                CASCADE;
DROP VIEW IF EXISTS wonderapps_dashboard.accounts            CASCADE;
DROP VIEW IF EXISTS wonderapps_dashboard.career_industries   CASCADE;  -- from an earlier draft of this script

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

-- One row per retained workflow run (a job search). Enums and counts only: no query text,
-- locations, goal or job data.
CREATE VIEW wonderapps_dashboard.run_facts AS
SELECT d.tenant_id,
       wonderapps_dashboard.j_pick(r.value ->> 'trigger', ARRAY['manual','schedule']) AS trigger,
       wonderapps_dashboard.j_pick(r.value ->> 'status', ARRAY['PENDING','RUNNING','WAITING_FOR_USER','PAUSED','STOPPING','STOPPED','COMPLETED','COMPLETED_WITH_WARNINGS','FAILED','CANCELLED']) AS status,
       wonderapps_dashboard.j_ts(r.value ->> 'createdAt') AS created_at,
       wonderapps_dashboard.j_num(r.value #>> '{summary,jobsRetained}')  AS jobs_retained,
       wonderapps_dashboard.j_num(r.value #>> '{summary,strongMatches}') AS strong_matches
FROM wonderapps_dashboard.docs d
CROSS JOIN LATERAL jsonb_each(wonderapps_dashboard.j_obj(d.d -> 'runs')) r
WHERE d.store = 'wj.workflow' AND jsonb_typeof(r.value) = 'object';

-- One row per saved search schedule. No name, query or time of day.
CREATE VIEW wonderapps_dashboard.schedule_facts AS
SELECT d.tenant_id,
       (s.value ->> 'enabled') = 'true' AS enabled,
       wonderapps_dashboard.j_pick(s.value ->> 'trigger', ARRAY['schedule','manual','event']) AS trigger
FROM wonderapps_dashboard.docs d
CROSS JOIN LATERAL jsonb_each(wonderapps_dashboard.j_obj(d.d -> 'schedules')) s
WHERE d.store = 'wj.workflow' AND jsonb_typeof(s.value) = 'object';

-- One row per application in a candidate's pipeline: stage, dates, and whether drafts exist.
-- Never the job, employer or draft text.
CREATE VIEW wonderapps_dashboard.application_facts AS
SELECT d.tenant_id,
       COALESCE(wonderapps_dashboard.j_pick(a.value ->> 'status', ARRAY['saved','preparing','ready_for_review','submitted','under_review','interview','rejected','withdrawn','offer','unknown']), 'unknown') AS status,
       wonderapps_dashboard.j_ts(a.value ->> 'createdAt') AS created_at,
       wonderapps_dashboard.j_ts(a.value ->> 'appliedAt') AS applied_at,
       EXISTS (SELECT 1 FROM jsonb_array_elements(wonderapps_dashboard.j_arr(a.value -> 'artifacts')) x WHERE x ->> 'type' = 'resume')       AS has_resume,
       EXISTS (SELECT 1 FROM jsonb_array_elements(wonderapps_dashboard.j_arr(a.value -> 'artifacts')) x WHERE x ->> 'type' = 'cover_letter') AS has_cover_letter,
       EXISTS (SELECT 1 FROM jsonb_array_elements(wonderapps_dashboard.j_arr(a.value -> 'artifacts')) x WHERE x ->> 'type' = 'answers')      AS has_answers
FROM wonderapps_dashboard.docs d
CROSS JOIN LATERAL jsonb_each(wonderapps_dashboard.j_obj(d.d -> 'applications')) a
WHERE d.store = 'wj.applications' AND jsonb_typeof(a.value) = 'object';

-- INTERNAL (not granted; feeds activity_events): pipeline events as type and time only.
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

-- Generated resumes (Resume Studio): the template family and when. Never the document.
CREATE VIEW wonderapps_dashboard.resume_facts AS
SELECT d.tenant_id,
       wonderapps_dashboard.j_pick(regexp_replace(COALESCE(r ->> 'templateId', ''), '-v\d+$', ''),
         ARRAY['executive','modern-minimal','technical','classic-ats','leadership','career-shift','academic','creative-modern']) AS template,
       wonderapps_dashboard.j_ts(r ->> 'createdAt') AS created_at
FROM wonderapps_dashboard.docs d
CROSS JOIN LATERAL jsonb_array_elements(wonderapps_dashboard.j_arr(d.d -> 'savedResumes')) r
WHERE d.store = 'wj.career';

-- One row per account: whether Career setup was finished, and the plan flag. Two scalars; no name,
-- headline, goal, skills or history.
CREATE VIEW wonderapps_dashboard.career_facts AS
SELECT d.tenant_id,
       (d.d ->> 'onboarded') = 'true' AS onboarded,
       COALESCE(wonderapps_dashboard.j_pick(d.d ->> 'plan', ARRAY['free','pro']), 'free') AS plan
FROM wonderapps_dashboard.docs d
WHERE d.store = 'wj.career';

-- One row per recorded AI call (the browser records these; platform-billed calls carry no cost).
CREATE VIEW wonderapps_dashboard.ai_usage_facts AS
SELECT d.tenant_id,
       wonderapps_dashboard.j_ts(u ->> 'at') AS at,
       wonderapps_dashboard.j_pick(u ->> 'provider', ARRAY['wonderjobs','anthropic','openai','gemini']) AS provider,
       wonderapps_dashboard.j_num(u ->> 'inputTokens')  AS input_tokens,
       wonderapps_dashboard.j_num(u ->> 'outputTokens') AS output_tokens,
       wonderapps_dashboard.j_num(u ->> 'costUsd')      AS cost_usd
FROM wonderapps_dashboard.docs d
CROSS JOIN LATERAL jsonb_array_elements(wonderapps_dashboard.j_arr(d.d -> 'usage')) u
WHERE d.store = 'wj.ai';

-- One row per "Apply with Wonder" session (the browser helper). Failure code, the hiring-system
-- family, start time and whether the helper connected; never the job, company, URL or form values.
CREATE VIEW wonderapps_dashboard.apply_session_facts AS
SELECT d.tenant_id,
       wonderapps_dashboard.j_pick(s.value ->> 'failure', ARRAY['AUTH_REQUIRED','MFA_REQUIRED','CAPTCHA_REQUIRED','FORM_NOT_FOUND','FIELD_AMBIGUOUS','FIELD_UNSUPPORTED','FILE_UPLOAD_FAILED','NAVIGATION_FAILED','DOMAIN_CHANGED','PAYMENT_REQUESTED','PORTAL_BLOCKED','ADAPTER_FAILURE','API_UNAUTHORIZED','API_VALIDATION_ERROR','DUPLICATE_APPLICATION','SUBMISSION_UNKNOWN','NETWORK_ERROR','USER_CANCELLED','SESSION_EXPIRED']) AS failure,
       COALESCE(wonderapps_dashboard.j_pick(COALESCE(s.value #>> '{form,provider}', s.value #>> '{destination,provider}'),
                ARRAY['greenhouse','lever','ashby','workday','smartrecruiters','workable','teamtailor','recruitee','personio']), 'other') AS ats,
       wonderapps_dashboard.j_ts(s.value ->> 'startedAt') AS started_at,
       EXISTS (SELECT 1 FROM jsonb_array_elements(wonderapps_dashboard.j_arr(s.value -> 'audit')) x WHERE x ->> 'event' = 'HELPER_CONNECTED') AS helper_connected
FROM wonderapps_dashboard.docs d
CROSS JOIN LATERAL jsonb_each(wonderapps_dashboard.j_obj(d.d -> 'sessions')) s
WHERE d.store = 'wj.jobsapply' AND jsonb_typeof(s.value) = 'object';

-- "Active" = an account did something itself:
--   joined (first sync), ran a search, started or updated an application, recorded a "not for me"
--   decision, generated a resume, or started an Apply-with-Wonder session.
-- Scheduled (cron) runs, auto-saved jobs, notifications and plain state syncs do NOT count: the
-- server writes those without the person being there.
CREATE VIEW wonderapps_dashboard.activity_events AS
SELECT a.tenant_id, a.created_at AS at, 'joined'::text AS kind FROM wonderapps_dashboard.accounts a
UNION ALL SELECT r.tenant_id, r.created_at, 'search'             FROM wonderapps_dashboard.run_facts r WHERE r.trigger = 'manual' AND r.created_at IS NOT NULL
UNION ALL SELECT f.tenant_id, f.created_at, 'application'        FROM wonderapps_dashboard.application_facts f WHERE f.created_at IS NOT NULL
UNION ALL SELECT e.tenant_id, e.at,         'application_update' FROM wonderapps_dashboard.application_events e WHERE e.type IS DISTINCT FROM 'discovered' AND e.at IS NOT NULL
UNION ALL SELECT j.tenant_id, j.at,         'rejection'          FROM wonderapps_dashboard.rejection_facts j WHERE j.at IS NOT NULL
UNION ALL SELECT s.tenant_id, s.created_at, 'resume'             FROM wonderapps_dashboard.resume_facts s WHERE s.created_at IS NOT NULL
UNION ALL SELECT x.tenant_id, x.started_at, 'apply_session'      FROM wonderapps_dashboard.apply_session_facts x WHERE x.started_at IS NOT NULL;


-- -------------------------------------------------------------------------------------
-- 5. Grants
-- -------------------------------------------------------------------------------------
-- 5a. The views the dashboard queries: SELECT only. Not granted: `docs`, `application_events`
-- (internal) and `excluded_accounts`.
GRANT SELECT ON
  wonderapps_dashboard.accounts,
  wonderapps_dashboard.activity_events,
  wonderapps_dashboard.run_facts,
  wonderapps_dashboard.schedule_facts,
  wonderapps_dashboard.application_facts,
  wonderapps_dashboard.rejection_facts,
  wonderapps_dashboard.resume_facts,
  wonderapps_dashboard.career_facts,
  wonderapps_dashboard.ai_usage_facts,
  wonderapps_dashboard.apply_session_facts
TO wonderapps_dashboard;

-- 5b. Flat tables with no personal data: column-level SELECT on exactly the columns the dashboard
-- queries read, plus the read policy the role needs because these tables have row-level security
-- on and the role does not bypass it. A table that does not exist yet (the JobsLake tables come
-- from migration 0007) is skipped, and its dashboard metrics show "could not be read" until the
-- migration is applied and this script is run again.
--
--   contact_messages     created_at, handled_at          NOT name, email, topic, message, page, user_agent, tenant_id
--   ai_provider_secrets  tenant_id                       NOT provider, ciphertext, masked, model, last_error (a key exists or not)
--   jobslake_runs        source_id, trigger, started_at, outcome
--                                                        NOT request_id, error_code, message (free text), counts
DO $$
DECLARE
  spec constant text[][] := ARRAY[
    ARRAY['contact_messages',    'created_at, handled_at'],
    ARRAY['ai_provider_secrets', 'tenant_id'],
    ARRAY['jobslake_runs',       'source_id, trigger, started_at, outcome']
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

-- 5c. Tables read only through the views above need no role-level grant and no policy, because the
-- views run as their owner. `wonderjobs.tenants` and `wonderjobs.app_state` are in that group, so
-- the role has no privilege on either and no policy is created on them for it, on purpose.


-- -------------------------------------------------------------------------------------
-- 6. Optional: keep your own accounts out of every number
-- -------------------------------------------------------------------------------------
-- Find your account's id in Supabase > Authentication > Users ("User UID"), then:
--
--   INSERT INTO wonderapps_dashboard.excluded_accounts (tenant_id, note)
--   VALUES ('00000000-0000-0000-0000-000000000000', 'founder test account')
--   ON CONFLICT (tenant_id) DO NOTHING;
--
-- Contact messages and JobsLake source calls are not tied to an account and are not filtered.
-- Messages are marked handled by hand:  UPDATE wonderjobs.contact_messages SET handled_at = now() WHERE id = '...';


-- -------------------------------------------------------------------------------------
-- 7. Smoke test, run as the dashboard role (psql with the new connection string).
--    The first must work; each of the others must fail with "permission denied".
-- -------------------------------------------------------------------------------------
--   SELECT count(*) FROM wonderapps_dashboard.accounts;
--   SELECT state FROM wonderjobs.app_state LIMIT 1;
--   SELECT email FROM wonderjobs.contact_messages LIMIT 1;
--   SELECT count(*) FROM wonderjobs.tenants;
--   INSERT INTO wonderjobs.tenants (id) VALUES ('x');
