-- =====================================================================================
-- WonderHome: least-privilege, READ-ONLY role for the WonderApps founder dashboard
-- =====================================================================================
--
-- Run ONCE, in the WonderHome Supabase project (SQL editor, as the `postgres` role).
-- Safe to re-run: every statement is idempotent, and a re-run first revokes everything the
-- role had in `public` and then grants exactly what is below, so it can only ever narrow.
--
-- BEFORE YOU RUN IT: replace '<<set-a-long-random-password>>' (one place, section 1) with a
-- long random password (`openssl rand -base64 36`). The script refuses to create the role while
-- the placeholder is still there. Then build the connection string from the Supabase "Connect"
-- page (pooler host; the user is `wonderapps_dashboard.<project-ref>`) and put it in the
-- WonderApps environment as WONDERHOME_DATABASE_URL.
--
-- WHAT THE ROLE CAN DO
--   * LOGIN only. NOSUPERUSER, NOBYPASSRLS, no CREATEDB / CREATEROLE / REPLICATION.
--   * default_transaction_read_only = on, statement_timeout = 8s,
--     idle_in_transaction_session_timeout = 10s, lock_timeout = 2s, 6 connections at most.
--     (A session can switch its own read-only default off; the real guarantee is that the role
--     holds SELECT on a short list of columns and no write privilege anywhere.)
--   * SELECT on the columns in section 4 and nothing else. Section 4 is the whole of what the
--     dashboard can see. It has NO privilege on any column that holds a name, e-mail, phone
--     number, address, free text, message or note body, document, token, key or hash:
--       - profiles.display_name / avatar_url / timezone           (names, photos)
--       - household_members.display_name / nickname / notes / date_of_birth / ... (all but 3 ids)
--       - households.name                                          (a family's name)
--       - conversation_messages.content / metadata                 (what people said to the assistant)
--       - home_send_items.raw_text / subject / sender_address / file_path / extracted / ...
--       - notifications.title / body / message / action            (can name people and bills)
--       - household_ai_credentials.api_key                         (a household's own model key)
--       - household_subscriptions.external_ref                     (provider customer ids)
--       - payments.method_last4 / provider_* ; payment_refunds.provider_*
--       - jobs.payload / last_error ; privacy_requests.*_member_id / refusal_reason
--       - everything in `auth`, `storage`, `wh` and every health, school, pet, meal or bill CONTENT column
--     Table-level grants are never used, so a column added to a table later is NOT visible
--     until you add it here on purpose.
--
-- WHY THE POLICIES
--   Every WonderHome table has row-level security on, and its policies only admit signed-in
--   household members. This role is not a member of anything and does not bypass RLS, so
--   without the per-table `wonderapps_dashboard_read` policy below it would see zero rows.
--   Each policy is `FOR SELECT TO wonderapps_dashboard USING (true)`: it opens rows to this
--   role only, and the column grants above decide which fields can be read.
--
-- ASSUMPTIONS A FOUNDER SHOULD KNOW (also noted as -- NOTE in the queries)
--   * `auth.users` is NOT used and NOT granted. A "user" is a row in public.profiles, created
--     when someone creates a household or accepts an invitation; sign-ups that never got that
--     far are invisible to the dashboard. last_sign_in_at is a single latest value and cannot
--     give a per-day active-user series, so "active" is built from activity tables instead.
--   * There is no demo/test flag in the schema. Platform staff (public.platform_admins) are
--     excluded from user counts and activity; any other test account you made (for example via
--     scripts/qa-test-user.mjs) is counted, because the only marker is an e-mail domain and
--     e-mail is never exposed here. Delete such accounts, or add them to platform_admins.
--   * Households with status 'closed' are excluded from household counts and plan mix.
--   * There is no table with AI tokens, credits or cost; the dashboard shows AI runs,
--     failures and proposal outcomes instead. There is no trial concept either.
--
-- RE-RUNNING AFTER A NEW METRIC: add the table/column to section 4 and its table name to
-- the policy list in section 5, then run the whole file again.
-- =====================================================================================


-- -------------------------------------------------------------------------------------
-- 0. Preconditions
-- -------------------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.households') IS NULL OR to_regclass('public.household_members') IS NULL THEN
    RAISE EXCEPTION 'public.households not found: run this in the WonderHome database';
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
-- Supabase's `postgres` is not a superuser, and since Postgres 16 only a superuser may even
-- write SUPERUSER / REPLICATION / BYPASSRLS in ALTER ROLE. CREATE ROLE above already sets them
-- off, and a non-superuser can never turn them on, so refuse to go on if someone else did.
DO $guard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wonderapps_dashboard'
             AND (rolsuper OR rolreplication OR rolbypassrls)) THEN
    RAISE EXCEPTION 'wonderapps_dashboard has SUPERUSER, REPLICATION or BYPASSRLS; a superuser must remove them before this script runs';
  END IF;
END
$guard$;
ALTER ROLE wonderapps_dashboard LOGIN NOCREATEDB NOCREATEROLE NOINHERIT CONNECTION LIMIT 6;
ALTER ROLE wonderapps_dashboard SET default_transaction_read_only = on;
ALTER ROLE wonderapps_dashboard SET statement_timeout = '8s';
ALTER ROLE wonderapps_dashboard SET idle_in_transaction_session_timeout = '10s';
ALTER ROLE wonderapps_dashboard SET lock_timeout = '2s';
ALTER ROLE wonderapps_dashboard SET search_path = pg_catalog;


-- -------------------------------------------------------------------------------------
-- 2. Reset: take back anything this role was given before, so a re-run only ever narrows
-- -------------------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM wonderapps_dashboard;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM wonderapps_dashboard;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM wonderapps_dashboard;


-- -------------------------------------------------------------------------------------
-- 3. Schema access (names only; it still needs a table or column grant for anything)
-- -------------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO wonderapps_dashboard;


-- -------------------------------------------------------------------------------------
-- 4. Column-level SELECT. This list IS the dashboard's view of the database.
--    Every column below is an id, an enum-like status/category word, a number or a timestamp.
-- -------------------------------------------------------------------------------------

-- Who and how many (ids and dates only; no names, no photos, no time zone)
GRANT SELECT (id, created_at)                                   ON public.profiles                TO wonderapps_dashboard;
GRANT SELECT (profile_id)                                       ON public.platform_admins         TO wonderapps_dashboard;  -- to exclude staff
GRANT SELECT (id, status, created_at, region)                   ON public.households              TO wonderapps_dashboard;  -- region = ISO country code
GRANT SELECT (id, household_id, profile_id)                     ON public.household_members       TO wonderapps_dashboard;  -- NOT name, birth date, notes...
GRANT SELECT (household_id, status)                             ON public.household_onboarding    TO wonderapps_dashboard;

-- Activity signals (who did something, and when; never what was said or sent)
GRANT SELECT (id, household_id, member_id, channel)             ON public.conversation_sessions   TO wonderapps_dashboard;
GRANT SELECT (session_id, role, created_at)                     ON public.conversation_messages   TO wonderapps_dashboard;  -- NOT content, metadata
GRANT SELECT (decided_by_member_id, decided_at, approval_status, created_at)
                                                                ON public.conversation_actions    TO wonderapps_dashboard;  -- NOT payload, result
GRANT SELECT (approver_member_id, decided_at)                   ON public.approvals               TO wonderapps_dashboard;  -- NOT summary
GRANT SELECT (household_id, created_by_member_id, source, created_at)
                                                                ON public.home_send_items         TO wonderapps_dashboard;  -- NOT raw_text, subject, sender, file
GRANT SELECT (recipient_member_id, created_at, delivered_at, seen_at, acted_at)
                                                                ON public.notifications           TO wonderapps_dashboard;  -- NOT title, body, message
GRANT SELECT (actor_profile_id, created_at)                     ON public.audit_events            TO wonderapps_dashboard;  -- NOT metadata
GRANT SELECT (event_type, created_at)                           ON public.notification_events     TO wonderapps_dashboard;  -- NOT metadata

-- Product depth (existence and creation time of household records; no content)
GRANT SELECT (household_id, created_at)                         ON public.meals                   TO wonderapps_dashboard;
GRANT SELECT (household_id, status, created_at, integration_id) ON public.obligations             TO wonderapps_dashboard;  -- NOT name, payee, amount
GRANT SELECT (household_id, created_at, integration_id)         ON public.school_items            TO wonderapps_dashboard;  -- NOT title, detail
GRANT SELECT (household_id, status, created_at, integration_id) ON public.family_events           TO wonderapps_dashboard;  -- NOT title, location, notes
GRANT SELECT (household_id, active, created_at)                 ON public.pets                    TO wonderapps_dashboard;  -- NOT name, vet, notes
GRANT SELECT (household_id, status, created_at)                 ON public.home_assets             TO wonderapps_dashboard;  -- NOT name, location
GRANT SELECT (household_id, active, created_at)                 ON public.consumables             TO wonderapps_dashboard;  -- NOT name
GRANT SELECT (household_id)                                     ON public.health_profiles         TO wonderapps_dashboard;
GRANT SELECT (created_at)                                       ON public.health_appointments     TO wonderapps_dashboard;  -- a count by day only
GRANT SELECT (status, due_at)                                   ON public.outcomes                TO wonderapps_dashboard;  -- NOT state

-- Revenue (plan, status, amounts; no provider reference or card details)
GRANT SELECT (household_id, plan_key, status, provider, billing_interval, currency, amount)
                                                                ON public.household_subscriptions TO wonderapps_dashboard;  -- NOT external_ref
GRANT SELECT (status, amount, currency, paid_at)                ON public.payments                TO wonderapps_dashboard;  -- NOT provider ids, method_last4
GRANT SELECT (status, amount, currency, completed_at)           ON public.payment_refunds         TO wonderapps_dashboard;  -- NOT provider ids, reason
GRANT SELECT (event_type, applied, occurred_at)                 ON public.billing_events          TO wonderapps_dashboard;  -- NOT provider_event_id

-- AI
GRANT SELECT (status, started_at)                               ON public.agent_runs              TO wonderapps_dashboard;  -- NOT plan, summary
GRANT SELECT (household_id)                                     ON public.household_ai_credentials TO wonderapps_dashboard; -- NEVER api_key

-- Health
GRANT SELECT (status, run_after, updated_at)                    ON public.jobs                    TO wonderapps_dashboard;  -- NOT payload, last_error
GRANT SELECT (status)                                           ON public.integrations            TO wonderapps_dashboard;  -- NOT credential_ref
GRANT SELECT (status)                                           ON public.privacy_requests        TO wonderapps_dashboard;


-- -------------------------------------------------------------------------------------
-- 5. Row-level security: let this role (and only this role) see rows in those tables.
--    Column grants in section 4 still decide what can be read. Idempotent per table.
-- -------------------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles', 'platform_admins', 'households', 'household_members', 'household_onboarding',
    'conversation_sessions', 'conversation_messages', 'conversation_actions', 'approvals',
    'home_send_items', 'notifications', 'audit_events', 'notification_events',
    'meals', 'obligations', 'school_items', 'family_events', 'pets', 'home_assets', 'consumables',
    'health_profiles', 'health_appointments', 'outcomes',
    'household_subscriptions', 'payments', 'payment_refunds', 'billing_events',
    'agent_runs', 'household_ai_credentials',
    'jobs', 'integrations', 'privacy_requests'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.%I', t);
    EXECUTE format('CREATE POLICY wonderapps_dashboard_read ON public.%I FOR SELECT TO wonderapps_dashboard USING (true)', t);
  END LOOP;
END $$;
