-- =============================================================================
-- WonderID: least-privilege, read-only database role for the WonderApps founder dashboard.
--
-- Run ONCE, as a database owner (the `postgres` role in the Supabase SQL editor), against the
-- WonderID production project. It is idempotent: re-running converges to exactly this state,
-- and it first strips any older grants this role holds so removed columns cannot linger.
--
-- BEFORE RUNNING: replace the password placeholder in the DO block below with a long random
-- password (24 characters minimum, 32+ recommended). The script refuses to run while it is still there. Then put the connection string
-- of THIS role (not the postgres or service_role one) into WonderApps as WONDERID_DATABASE_URL.
-- On Supabase use the pooler host and the user name `wonderapps_dashboard.<project-ref>`, with
-- sslmode=require.
--
-- What the role can do
--   * LOGIN only. Not a superuser, cannot create roles/databases, cannot replicate, and does NOT
--     bypass row-level security (NOBYPASSRLS).
--   * SELECT on 27 tables, and only on the listed columns. Nothing else: no INSERT, UPDATE,
--     DELETE, TRUNCATE, no sequences, no other schemas (not auth, not storage).
--   * Every query WonderApps runs is a fixed aggregate (counts, sums, medians, labels such as plan
--     or severity). The role is still column-restricted so that even a leaked connection string
--     cannot read emails, names, external ids, identity attributes, free text, evidence payloads,
--     tokens, keys or credentials: those columns are simply not granted.
--
-- Safety nets (defence in depth, not the primary control)
--   * default_transaction_read_only = on: sessions start read-only. A client can switch this off
--     for itself, which is why the real protection is that no write privilege is granted at all.
--   * statement_timeout = 8s, idle_in_transaction_session_timeout = 15s, lock_timeout = 2s and
--     CONNECTION LIMIT 5, so a bad query or a stuck connection cannot hurt the product database.
--
-- Row-level security: these tables have RLS enabled and the role does not bypass it, so each table
-- below gets one policy, wonderapps_dashboard_read (SELECT, TO this role only, USING (true)).
-- The policy applies to this role alone; it does not widen access for any customer or other role.
--
-- To revoke everything later: DROP OWNED BY wonderapps_dashboard; DROP ROLE wonderapps_dashboard;
-- =============================================================================

-- 1. The role -------------------------------------------------------------------
DO $role$
DECLARE
  -- Paste the password between the quotes. Do not commit the edited file.
  pw constant text := '<<set-a-long-random-password>>';
BEGIN
  IF pw LIKE '<<%' THEN
    RAISE EXCEPTION 'Replace the password placeholder in this script before running it.';
  END IF;
  IF length(pw) < 24 THEN
    RAISE EXCEPTION 'Use a password of at least 24 characters.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wonderapps_dashboard') THEN
    EXECUTE format('CREATE ROLE wonderapps_dashboard LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS INHERIT CONNECTION LIMIT 5', pw);
  ELSE
    -- NOTE: only LOGIN, the password and the connection limit are altered here. On Supabase the
    -- postgres role is not a superuser and may not restate NOSUPERUSER / NOBYPASSRLS in ALTER ROLE;
    -- the check below proves the role is still unprivileged instead.
    EXECUTE format('ALTER ROLE wonderapps_dashboard WITH LOGIN PASSWORD %L CONNECTION LIMIT 5', pw);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wonderapps_dashboard'
             AND (rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication)) THEN
    RAISE EXCEPTION 'Role wonderapps_dashboard already exists with elevated attributes; drop it and re-run.';
  END IF;
END
$role$;

ALTER ROLE wonderapps_dashboard SET default_transaction_read_only = on;
ALTER ROLE wonderapps_dashboard SET statement_timeout = '8s';
ALTER ROLE wonderapps_dashboard SET idle_in_transaction_session_timeout = '15s';
ALTER ROLE wonderapps_dashboard SET lock_timeout = '2s';
ALTER ROLE wonderapps_dashboard SET search_path = pg_catalog, public;

-- 2. Start from nothing, then grant exactly what the metrics read --------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM wonderapps_dashboard;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM wonderapps_dashboard;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM wonderapps_dashboard;
GRANT USAGE ON SCHEMA public TO wonderapps_dashboard;
-- NOTE: no other schema is needed. In particular auth.users is NOT used: the activity signal comes
-- from public.audit_logs, so the dashboard never touches Supabase Auth (sign-in times, emails).

-- tenants: Customer tenants: count, signup date, deprovisioned/suspended state. name and slug are NOT granted.
GRANT SELECT (id, status, created_at) ON public.tenants TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.tenants;
CREATE POLICY wonderapps_dashboard_read ON public.tenants FOR SELECT TO wonderapps_dashboard USING (true);

-- platform_tenants: Flags sandbox/demo tenants so they are excluded from every metric. notes is NOT granted.
GRANT SELECT (tenant_id, environment) ON public.platform_tenants TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.platform_tenants;
CREATE POLICY wonderapps_dashboard_read ON public.platform_tenants FOR SELECT TO wonderapps_dashboard USING (true);

-- tenant_memberships: Distinct active people per real tenant (user_id is an opaque uuid, only ever used inside count(DISTINCT ...)). Invitation, auth-method and status-reason columns are NOT granted.
GRANT SELECT (tenant_id, user_id, status) ON public.tenant_memberships TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.tenant_memberships;
CREATE POLICY wonderapps_dashboard_read ON public.tenant_memberships FOR SELECT TO wonderapps_dashboard USING (true);

-- audit_logs: The activity signal for DAU/WAU/MAU, active tenants and retention. actor_id is an opaque uuid used only inside count(DISTINCT ...); action is a fixed event code ('platform.*' codes are filtered out). object_id, metadata (free-form JSON), outcome and correlation_id are NOT granted.
GRANT SELECT (tenant_id, actor_id, actor_type, action, created_at) ON public.audit_logs TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.audit_logs;
CREATE POLICY wonderapps_dashboard_read ON public.audit_logs FOR SELECT TO wonderapps_dashboard USING (true);

-- access_requests: Access requests raised and time to decide. justification, policy_result and every identity reference are NOT granted.
GRANT SELECT (tenant_id, status, created_at, decided_at) ON public.access_requests TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.access_requests;
CREATE POLICY wonderapps_dashboard_read ON public.access_requests FOR SELECT TO wonderapps_dashboard USING (true);

-- access_request_approvals: Approvals decided, pending and overdue. comment, approver ids and fingerprints are NOT granted.
GRANT SELECT (tenant_id, status, decided_at, due_at) ON public.access_request_approvals TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.access_request_approvals;
CREATE POLICY wonderapps_dashboard_read ON public.access_request_approvals FOR SELECT TO wonderapps_dashboard USING (true);

-- access_package_assignments: Access packages assigned per day. identity_id, justification and end_reason are NOT granted.
GRANT SELECT (tenant_id, created_at) ON public.access_package_assignments TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.access_package_assignments;
CREATE POLICY wonderapps_dashboard_read ON public.access_package_assignments FOR SELECT TO wonderapps_dashboard USING (true);

-- identity_reconciliation_runs: Identity imports: records reconciled, failures, stuck runs. errors and changes (JSON that can quote customer records) are NOT granted.
GRANT SELECT (tenant_id, status, dry_run, created_count, updated_count, created_at) ON public.identity_reconciliation_runs TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.identity_reconciliation_runs;
CREATE POLICY wonderapps_dashboard_read ON public.identity_reconciliation_runs FOR SELECT TO wonderapps_dashboard USING (true);

-- identity_sources: Identity sources by connector type. name, attribute_mappings and correlation_rules are NOT granted.
GRANT SELECT (tenant_id, template, status, integration_id) ON public.identity_sources TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.identity_sources;
CREATE POLICY wonderapps_dashboard_read ON public.identity_sources FOR SELECT TO wonderapps_dashboard USING (true);

-- integrations: Connector type and connected state. name, config and capabilities are NOT granted (credentials live in integration_credentials, which is never granted).
GRANT SELECT (id, tenant_id, integration_type_id, status) ON public.integrations TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.integrations;
CREATE POLICY wonderapps_dashboard_read ON public.integrations FOR SELECT TO wonderapps_dashboard USING (true);

-- integration_sync_jobs: Failed and stuck connector syncs, imports processed. errors (free text) is NOT granted.
GRANT SELECT (tenant_id, status, created_at, records_processed) ON public.integration_sync_jobs TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.integration_sync_jobs;
CREATE POLICY wonderapps_dashboard_read ON public.integration_sync_jobs FOR SELECT TO wonderapps_dashboard USING (true);

-- agents: AI agents governed, by lifecycle state. Names, descriptions, model, owner and credential references are NOT granted.
GRANT SELECT (tenant_id, lifecycle_state) ON public.agents TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.agents;
CREATE POLICY wonderapps_dashboard_read ON public.agents FOR SELECT TO wonderapps_dashboard USING (true);

-- identities: Identities under governance by type. Names, emails, usernames, attributes, departments and source ids are NOT granted.
GRANT SELECT (tenant_id, identity_type, status) ON public.identities TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.identities;
CREATE POLICY wonderapps_dashboard_read ON public.identities FOR SELECT TO wonderapps_dashboard USING (true);

-- risk_findings: Findings raised, resolved, open by severity, time to resolve. title, explanation, reasons, agent_id and resolution reasons are NOT granted.
GRANT SELECT (tenant_id, severity, status, created_at, resolved_at) ON public.risk_findings TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.risk_findings;
CREATE POLICY wonderapps_dashboard_read ON public.risk_findings FOR SELECT TO wonderapps_dashboard USING (true);

-- certification_campaigns: Certification campaigns launched (funnel). name and scope are NOT granted.
GRANT SELECT (tenant_id, status) ON public.certification_campaigns TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.certification_campaigns;
CREATE POLICY wonderapps_dashboard_read ON public.certification_campaigns FOR SELECT TO wonderapps_dashboard USING (true);

-- certification_items: Pending certification reviews; id only joins decisions to a tenant. reviewer_id and snapshot are NOT granted.
GRANT SELECT (id, tenant_id, status) ON public.certification_items TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.certification_items;
CREATE POLICY wonderapps_dashboard_read ON public.certification_items FOR SELECT TO wonderapps_dashboard USING (true);

-- certification_decisions: Certification decisions per day. justification, decided_by and snapshot are NOT granted.
GRANT SELECT (item_id, decided_at) ON public.certification_decisions TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.certification_decisions;
CREATE POLICY wonderapps_dashboard_read ON public.certification_decisions FOR SELECT TO wonderapps_dashboard USING (true);

-- application_onboardings: Application onboardings promoted. config and approval notes are NOT granted.
GRANT SELECT (tenant_id, promoted_at) ON public.application_onboardings TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.application_onboardings;
CREATE POLICY wonderapps_dashboard_read ON public.application_onboardings FOR SELECT TO wonderapps_dashboard USING (true);

-- applications: Applications onboarded. Names, vendor, URL and owners are NOT granted.
GRANT SELECT (tenant_id, onboarding_status) ON public.applications TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.applications;
CREATE POLICY wonderapps_dashboard_read ON public.applications FOR SELECT TO wonderapps_dashboard USING (true);

-- accounts: Share of application accounts tied to a known identity. Account names, external refs and identity links are NOT granted.
GRANT SELECT (tenant_id, status, correlation) ON public.accounts TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.accounts;
CREATE POLICY wonderapps_dashboard_read ON public.accounts FOR SELECT TO wonderapps_dashboard USING (true);

-- application_discoveries: Unrecognised (shadow) applications waiting for a decision. Names, URLs and evidence are NOT granted.
GRANT SELECT (tenant_id, status) ON public.application_discoveries TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.application_discoveries;
CREATE POLICY wonderapps_dashboard_read ON public.application_discoveries FOR SELECT TO wonderapps_dashboard USING (true);

-- pending_identity_correlations: Ambiguous identity matches waiting for a person. external_id and normalized (customer records) are NOT granted.
GRANT SELECT (tenant_id, status) ON public.pending_identity_correlations TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.pending_identity_correlations;
CREATE POLICY wonderapps_dashboard_read ON public.pending_identity_correlations FOR SELECT TO wonderapps_dashboard USING (true);

-- identity_lifecycle_tasks: Open joiner/mover/leaver tasks. detail and resolution_note are NOT granted.
GRANT SELECT (tenant_id, status) ON public.identity_lifecycle_tasks TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.identity_lifecycle_tasks;
CREATE POLICY wonderapps_dashboard_read ON public.identity_lifecycle_tasks FOR SELECT TO wonderapps_dashboard USING (true);

-- runtime_decisions: AI agent runtime gateway decisions per day. Resource, tool, reason, request ids and restrictions are NOT granted.
GRANT SELECT (tenant_id, decision, created_at) ON public.runtime_decisions TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.runtime_decisions;
CREATE POLICY wonderapps_dashboard_read ON public.runtime_decisions FOR SELECT TO wonderapps_dashboard USING (true);

-- subscriptions: Plan mix, paid-tier tenants, past-due. The plan limits (max_*) are not needed and NOT granted.
GRANT SELECT (tenant_id, plan, status, started_at) ON public.subscriptions TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.subscriptions;
CREATE POLICY wonderapps_dashboard_read ON public.subscriptions FOR SELECT TO wonderapps_dashboard USING (true);

-- onboarding_proposals: AI-assisted onboarding proposals per day and provider. proposal, ai_accepted, ai_rejected and ai_error (free text) are NOT granted.
GRANT SELECT (tenant_id, ai_used, ai_provider, created_at) ON public.onboarding_proposals TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.onboarding_proposals;
CREATE POLICY wonderapps_dashboard_read ON public.onboarding_proposals FOR SELECT TO wonderapps_dashboard USING (true);

-- platform_ai_provider_configs: Bring-your-own-key adoption. encrypted_api_key and model are NOT granted.
GRANT SELECT (tenant_id, provider, use_own_key) ON public.platform_ai_provider_configs TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON public.platform_ai_provider_configs;
CREATE POLICY wonderapps_dashboard_read ON public.platform_ai_provider_configs FOR SELECT TO wonderapps_dashboard USING (true);

-- 3. Check (optional, read-only) ----------------------------------------------------
-- Every column the role can read; the list must match the GRANT lines above and contain nothing
-- named email, name, display_name, username, metadata, config, evidence, secret, token or key:
--   SELECT table_name, column_name FROM information_schema.column_privileges
--   WHERE grantee = 'wonderapps_dashboard' AND privilege_type = 'SELECT' ORDER BY 1, 2;
-- Any privilege other than SELECT (must return no rows):
--   SELECT * FROM information_schema.role_table_grants
--   WHERE grantee = 'wonderapps_dashboard' AND privilege_type <> 'SELECT';
