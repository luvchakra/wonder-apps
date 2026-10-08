-- =====================================================================================================
-- WonderApps founder dashboard: read-only database role for Wonder Creator
--
-- Run ONCE by the project owner (Supabase SQL editor, as the `postgres` role). Safe to re-run: every statement is
-- idempotent, and a re-run first strips this role's table privileges and re-grants exactly the list below, so
-- removing a column here and re-running revokes it.
--
-- What it creates
--   * Role wonderapps_dashboard: LOGIN only, no superuser / createdb / createrole / replication / bypassrls.
--     Every session starts read-only (default_transaction_read_only), with an 8 s statement timeout, a 2 s lock
--     timeout and a short idle-in-transaction timeout. At most 5 connections.
--   * USAGE on schema public only. No access to auth, storage, app, extensions, vault or any other schema.
--   * COLUMN-LEVEL SELECT on 34 tables in public, only the columns the dashboard queries read
--     (src/lib/dashboard/apps/wondercreator.ts). The role has no access to emails, names, handles, bios,
--     locations, titles, descriptions, free text, message bodies, URLs, keys, tokens or file paths: those columns
--     are simply not granted, so `SELECT display_name FROM public.creators` fails with "permission denied".
--     The granted columns are timestamps, status/type enums, counters, amounts and creator_id (an opaque uuid, used
--     only inside COUNT(DISTINCT ...) to count people, never returned).
--   * One RLS policy per table, wonderapps_dashboard_read, FOR SELECT TO wonderapps_dashboard USING (true). Wonder Creator
--     enables row-level security on its tables and this role does not bypass it, so without the policy every
--     count would be zero. The policy is scoped TO this role: it changes nothing for anon / authenticated users.
--     (Tables where RLS happens to be off are unaffected by the policy.)
--
-- Before running: replace <<set-a-long-random-password>> below with a long random password (the script refuses to
-- create the role with the placeholder). Put the connection string in WONDERCREATOR_DATABASE_URL in Vercel.
-- On Supabase use the pooler (session mode, port 5432) with user `wonderapps_dashboard.<project-ref>`, or the direct
-- connection with user `wonderapps_dashboard`. To rotate the password later:  ALTER ROLE wonderapps_dashboard PASSWORD '...';
-- To remove everything:  DROP OWNED BY wonderapps_dashboard; DROP ROLE wonderapps_dashboard;
--
-- NOT used, on purpose: auth.users (owned by Supabase's auth admin, and it holds emails). Every signal the
-- dashboard needs exists in an app table: public.creators is one row per signed-up account.
-- =====================================================================================================

BEGIN;

-- 1. The role (created once; the password is never touched on a re-run) ------------------------------------------
DO $$
DECLARE
  v_password text := '<<set-a-long-random-password>>';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wonderapps_dashboard') THEN
    IF v_password LIKE '<<%' THEN
      RAISE EXCEPTION 'Replace the password placeholder with a long random password before running this script.';
    END IF;
    EXECUTE format('CREATE ROLE wonderapps_dashboard LOGIN PASSWORD %L', v_password);
  END IF;
END
$$;

-- 2. Role attributes and session guards (re-asserted on every run) -----------------------------------------------
ALTER ROLE wonderapps_dashboard WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 5;
ALTER ROLE wonderapps_dashboard SET default_transaction_read_only = on;
ALTER ROLE wonderapps_dashboard SET statement_timeout = '8s';
ALTER ROLE wonderapps_dashboard SET lock_timeout = '2s';
ALTER ROLE wonderapps_dashboard SET idle_in_transaction_session_timeout = '15s';
ALTER ROLE wonderapps_dashboard SET search_path = public, pg_catalog;

-- 3. Start from nothing, then grant exactly what the queries read -------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM wonderapps_dashboard;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM wonderapps_dashboard;
REVOKE ALL ON SCHEMA public FROM wonderapps_dashboard;
GRANT USAGE ON SCHEMA public TO wonderapps_dashboard;

-- 01. public.creators
GRANT SELECT (id, created_at) ON public.creators TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.creators;
CREATE POLICY wonderapps_dashboard_read ON public.creators FOR SELECT TO wonderapps_dashboard USING (true);

-- 02. public.creative_materials
GRANT SELECT (creator_id, created_at, type) ON public.creative_materials TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.creative_materials;
CREATE POLICY wonderapps_dashboard_read ON public.creative_materials FOR SELECT TO wonderapps_dashboard USING (true);

-- 03. public.artifacts
GRANT SELECT (id, creator_id, created_at, category, artifact_type) ON public.artifacts TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.artifacts;
CREATE POLICY wonderapps_dashboard_read ON public.artifacts FOR SELECT TO wonderapps_dashboard USING (true);

-- 04. public.artifact_versions
GRANT SELECT (creator_id, created_by_creator_id, created_at, author_kind) ON public.artifact_versions TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.artifact_versions;
CREATE POLICY wonderapps_dashboard_read ON public.artifact_versions FOR SELECT TO wonderapps_dashboard USING (true);

-- 05. public.conversation_messages
GRANT SELECT (creator_id, created_at, role) ON public.conversation_messages TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.conversation_messages;
CREATE POLICY wonderapps_dashboard_read ON public.conversation_messages FOR SELECT TO wonderapps_dashboard USING (true);

-- 06. public.ai_runs
GRANT SELECT (creator_id, started_at, intent, status, estimated_cost_usd) ON public.ai_runs TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.ai_runs;
CREATE POLICY wonderapps_dashboard_read ON public.ai_runs FOR SELECT TO wonderapps_dashboard USING (true);

-- 07. public.image_generations
GRANT SELECT (creator_id, created_at, status) ON public.image_generations TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.image_generations;
CREATE POLICY wonderapps_dashboard_read ON public.image_generations FOR SELECT TO wonderapps_dashboard USING (true);

-- 08. public.scrapbook_posts
GRANT SELECT (creator_id, created_at) ON public.scrapbook_posts TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.scrapbook_posts;
CREATE POLICY wonderapps_dashboard_read ON public.scrapbook_posts FOR SELECT TO wonderapps_dashboard USING (true);

-- 09. public.scrapbook_replies
GRANT SELECT (creator_id, created_at) ON public.scrapbook_replies TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.scrapbook_replies;
CREATE POLICY wonderapps_dashboard_read ON public.scrapbook_replies FOR SELECT TO wonderapps_dashboard USING (true);

-- 10. public.open_conversations
GRANT SELECT (creator_id, created_at, removed_at) ON public.open_conversations TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.open_conversations;
CREATE POLICY wonderapps_dashboard_read ON public.open_conversations FOR SELECT TO wonderapps_dashboard USING (true);

-- 11. public.open_conversation_replies
GRANT SELECT (creator_id, created_at, deleted_at, removed_at) ON public.open_conversation_replies TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.open_conversation_replies;
CREATE POLICY wonderapps_dashboard_read ON public.open_conversation_replies FOR SELECT TO wonderapps_dashboard USING (true);

-- 12. public.crew_messages
GRANT SELECT (creator_id, created_at) ON public.crew_messages TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.crew_messages;
CREATE POLICY wonderapps_dashboard_read ON public.crew_messages FOR SELECT TO wonderapps_dashboard USING (true);

-- 13. public.direct_messages
GRANT SELECT (creator_id, created_at) ON public.direct_messages TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.direct_messages;
CREATE POLICY wonderapps_dashboard_read ON public.direct_messages FOR SELECT TO wonderapps_dashboard USING (true);

-- 14. public.huddles
GRANT SELECT (started_at) ON public.huddles TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.huddles;
CREATE POLICY wonderapps_dashboard_read ON public.huddles FOR SELECT TO wonderapps_dashboard USING (true);

-- 15. public.huddle_participants
GRANT SELECT (creator_id, joined_at) ON public.huddle_participants TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.huddle_participants;
CREATE POLICY wonderapps_dashboard_read ON public.huddle_participants FOR SELECT TO wonderapps_dashboard USING (true);

-- 16. public.artifact_comments
GRANT SELECT (artifact_id, creator_id, created_at) ON public.artifact_comments TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.artifact_comments;
CREATE POLICY wonderapps_dashboard_read ON public.artifact_comments FOR SELECT TO wonderapps_dashboard USING (true);

-- 17. public.creator_ai_keys
GRANT SELECT (creator_id, status, created_at) ON public.creator_ai_keys TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.creator_ai_keys;
CREATE POLICY wonderapps_dashboard_read ON public.creator_ai_keys FOR SELECT TO wonderapps_dashboard USING (true);

-- 18. public.published_works
GRANT SELECT (creator_id) ON public.published_works TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.published_works;
CREATE POLICY wonderapps_dashboard_read ON public.published_works FOR SELECT TO wonderapps_dashboard USING (true);

-- 19. public.published_revisions
GRANT SELECT (revision_number, published_at) ON public.published_revisions TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.published_revisions;
CREATE POLICY wonderapps_dashboard_read ON public.published_revisions FOR SELECT TO wonderapps_dashboard USING (true);

-- 20. public.published_work_stats
GRANT SELECT (day, views) ON public.published_work_stats TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.published_work_stats;
CREATE POLICY wonderapps_dashboard_read ON public.published_work_stats FOR SELECT TO wonderapps_dashboard USING (true);

-- 21. public.publications
GRANT SELECT (creator_id, status, updated_at) ON public.publications TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.publications;
CREATE POLICY wonderapps_dashboard_read ON public.publications FOR SELECT TO wonderapps_dashboard USING (true);

-- 22. public.artifact_shares
GRANT SELECT (creator_id) ON public.artifact_shares TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.artifact_shares;
CREATE POLICY wonderapps_dashboard_read ON public.artifact_shares FOR SELECT TO wonderapps_dashboard USING (true);

-- 23. public.creator_pages
GRANT SELECT (creator_id, is_published) ON public.creator_pages TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.creator_pages;
CREATE POLICY wonderapps_dashboard_read ON public.creator_pages FOR SELECT TO wonderapps_dashboard USING (true);

-- 24. public.projects
GRANT SELECT (created_at, status, community_privacy) ON public.projects TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.projects;
CREATE POLICY wonderapps_dashboard_read ON public.projects FOR SELECT TO wonderapps_dashboard USING (true);

-- 25. public.ai_proposals
GRANT SELECT (created_at, status) ON public.ai_proposals TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.ai_proposals;
CREATE POLICY wonderapps_dashboard_read ON public.ai_proposals FOR SELECT TO wonderapps_dashboard USING (true);

-- 26. public.dejavu_suggestions
GRANT SELECT (created_at, status) ON public.dejavu_suggestions TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.dejavu_suggestions;
CREATE POLICY wonderapps_dashboard_read ON public.dejavu_suggestions FOR SELECT TO wonderapps_dashboard USING (true);

-- 27. public.moment_connections
GRANT SELECT (created_at, status) ON public.moment_connections TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.moment_connections;
CREATE POLICY wonderapps_dashboard_read ON public.moment_connections FOR SELECT TO wonderapps_dashboard USING (true);

-- 28. public.context_candidates
GRANT SELECT (created_at, state) ON public.context_candidates TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.context_candidates;
CREATE POLICY wonderapps_dashboard_read ON public.context_candidates FOR SELECT TO wonderapps_dashboard USING (true);

-- 29. public.contributions
GRANT SELECT (kind, created_at, retracted_at) ON public.contributions TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.contributions;
CREATE POLICY wonderapps_dashboard_read ON public.contributions FOR SELECT TO wonderapps_dashboard USING (true);

-- 30. public.licenses
GRANT SELECT (status, mode) ON public.licenses TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.licenses;
CREATE POLICY wonderapps_dashboard_read ON public.licenses FOR SELECT TO wonderapps_dashboard USING (true);

-- 31. public.payment_orders
GRANT SELECT (status, currency, amount_minor, refunded_minor, paid_at) ON public.payment_orders TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.payment_orders;
CREATE POLICY wonderapps_dashboard_read ON public.payment_orders FOR SELECT TO wonderapps_dashboard USING (true);

-- 32. public.jobs
GRANT SELECT (status, run_after, updated_at) ON public.jobs TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.jobs;
CREATE POLICY wonderapps_dashboard_read ON public.jobs FOR SELECT TO wonderapps_dashboard USING (true);

-- 33. public.moderation_reports
GRANT SELECT (status) ON public.moderation_reports TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.moderation_reports;
CREATE POLICY wonderapps_dashboard_read ON public.moderation_reports FOR SELECT TO wonderapps_dashboard USING (true);

-- 34. public.privacy_requests
GRANT SELECT (status, due_at) ON public.privacy_requests TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.privacy_requests;
CREATE POLICY wonderapps_dashboard_read ON public.privacy_requests FOR SELECT TO wonderapps_dashboard USING (true);

COMMIT;

-- 4. Check (optional): the role must see counts, and must be refused anything personal. Run as wonderapps_dashboard:
--    SELECT count(*) FROM public.creators;                 -- works
--    SELECT display_name FROM public.creators LIMIT 1;     -- ERROR: permission denied for table creators
--    SELECT * FROM auth.users LIMIT 1;                     -- ERROR: permission denied for schema auth
--    CREATE TABLE public.x (a int);                        -- ERROR: permission denied / read-only transaction
