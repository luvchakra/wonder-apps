-- WonderArk: least-privilege, read-only role for the WonderApps founder dashboard.
--
-- Run ONCE, as the database owner (the "postgres" role in the Supabase SQL editor), against the
-- WonderArk production database. It is idempotent: running it again re-applies exactly the grants
-- below and removes any that are no longer listed. Before the first run, replace the password
-- placeholder with a long random one (for example `openssl rand -base64 36`) and keep it in the
-- dashboard's WONDERARK_DATABASE_URL only. A later run never changes the password.
--
-- What the role can do
--   * log in, nothing else: no superuser, no create-db/role, no replication, NO BYPASSRLS,
--     read-only transactions by default, 8 s statement timeout, at most 5 connections;
--   * USAGE on the product schemas it reads (never on auth or storage);
--   * SELECT on a short list of COLUMNS, listed per table below. Names, emails, phones, GSTINs,
--     addresses, document numbers and contents, party ids, message and note bodies, file names,
--     tokens, API keys, encrypted credentials, payloads and provider ids are never granted;
--   * one permissive RLS policy per table (wonderapps_dashboard_read) so it can COUNT rows. Policies
--     are per role, so no signed-in user gains anything from them.
-- The dashboard only ever runs fixed aggregate queries (counts, sums, ratios) on top of this.
--
-- Not used on purpose: auth.users. Every signal comes from app tables, so no grant on the auth schema is needed.
--
-- To remove everything:  DROP OWNED BY wonderapps_dashboard;  DROP ROLE wonderapps_dashboard;

-- 1. The role --------------------------------------------------------------------------------
DO $role$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wonderapps_dashboard') THEN
    CREATE ROLE wonderapps_dashboard LOGIN PASSWORD '<<set-a-long-random-password>>'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 5;
  END IF;
END
$role$;

ALTER ROLE wonderapps_dashboard NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 5;
ALTER ROLE wonderapps_dashboard SET default_transaction_read_only = on;
ALTER ROLE wonderapps_dashboard SET statement_timeout = '8s';
ALTER ROLE wonderapps_dashboard SET idle_in_transaction_session_timeout = '10s';
ALTER ROLE wonderapps_dashboard SET lock_timeout = '2s';

-- 2. Start from nothing, so a re-run also removes grants that were dropped from this file ----
REVOKE ALL ON ALL TABLES IN SCHEMA core FROM wonderapps_dashboard;
REVOKE ALL ON ALL TABLES IN SCHEMA inventory FROM wonderapps_dashboard;
REVOKE ALL ON ALL TABLES IN SCHEMA fsm FROM wonderapps_dashboard;
REVOKE ALL ON ALL TABLES IN SCHEMA crm FROM wonderapps_dashboard;
REVOKE ALL ON ALL TABLES IN SCHEMA discovery FROM wonderapps_dashboard;
REVOKE ALL ON ALL TABLES IN SCHEMA gst FROM wonderapps_dashboard;
REVOKE ALL ON ALL TABLES IN SCHEMA platform FROM wonderapps_dashboard;
GRANT USAGE ON SCHEMA core TO wonderapps_dashboard;
GRANT USAGE ON SCHEMA inventory TO wonderapps_dashboard;
GRANT USAGE ON SCHEMA fsm TO wonderapps_dashboard;
GRANT USAGE ON SCHEMA crm TO wonderapps_dashboard;
GRANT USAGE ON SCHEMA discovery TO wonderapps_dashboard;
GRANT USAGE ON SCHEMA gst TO wonderapps_dashboard;
GRANT USAGE ON SCHEMA platform TO wonderapps_dashboard;

-- 3. Column-level read access, and the row policy that lets the role count ---------------------

-- core.businesses: tenant list, signups, suspended filter
GRANT SELECT (id, account_id, created_at, disabled_at) ON core.businesses TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON core.businesses;
CREATE POLICY wonderapps_dashboard_read ON core.businesses FOR SELECT TO wonderapps_dashboard USING (true);

-- core.demo_seed_batches: exclude businesses loaded with demo data
GRANT SELECT (business_id) ON core.demo_seed_batches TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON core.demo_seed_batches;
CREATE POLICY wonderapps_dashboard_read ON core.demo_seed_batches FOR SELECT TO wonderapps_dashboard USING (true);

-- core.business_members: seat count, "second member" test
GRANT SELECT (business_id, status) ON core.business_members TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON core.business_members;
CREATE POLICY wonderapps_dashboard_read ON core.business_members FOR SELECT TO wonderapps_dashboard USING (true);

-- core.business_invitations: "invited a teammate" funnel step (no email, name or token granted)
GRANT SELECT (business_id) ON core.business_invitations TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON core.business_invitations;
CREATE POLICY wonderapps_dashboard_read ON core.business_invitations FOR SELECT TO wonderapps_dashboard USING (true);

-- core.business_settings: plan mix
GRANT SELECT (business_id, plan) ON core.business_settings TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON core.business_settings;
CREATE POLICY wonderapps_dashboard_read ON core.business_settings FOR SELECT TO wonderapps_dashboard USING (true);

-- core.licenses: module adoption, modules per business, funnel
GRANT SELECT (id, business_id, module_key, status) ON core.licenses TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON core.licenses;
CREATE POLICY wonderapps_dashboard_read ON core.licenses FOR SELECT TO wonderapps_dashboard USING (true);

-- core.license_events: licence churn
GRANT SELECT (business_id, event_type, created_at) ON core.license_events TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON core.license_events;
CREATE POLICY wonderapps_dashboard_read ON core.license_events FOR SELECT TO wonderapps_dashboard USING (true);

-- core.audit_log: activity (who/when only; before/after payloads are NOT granted)
GRANT SELECT (business_id, actor_id, created_at) ON core.audit_log TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON core.audit_log;
CREATE POLICY wonderapps_dashboard_read ON core.audit_log FOR SELECT TO wonderapps_dashboard USING (true);

-- core.documents: invoices and activity (no party, number, amounts or notes)
GRANT SELECT (business_id, doc_type, created_by, created_at) ON core.documents TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON core.documents;
CREATE POLICY wonderapps_dashboard_read ON core.documents FOR SELECT TO wonderapps_dashboard USING (true);

-- core.payments: activity (no amount, party, reference)
GRANT SELECT (business_id, created_by, created_at) ON core.payments TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON core.payments;
CREATE POLICY wonderapps_dashboard_read ON core.payments FOR SELECT TO wonderapps_dashboard USING (true);

-- core.messages: activity (no addresses, subject or body)
GRANT SELECT (business_id, created_by, created_at) ON core.messages TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON core.messages;
CREATE POLICY wonderapps_dashboard_read ON core.messages FOR SELECT TO wonderapps_dashboard USING (true);

-- core.attachments: activity (no file name or path)
GRANT SELECT (business_id, uploaded_by, created_at) ON core.attachments TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON core.attachments;
CREATE POLICY wonderapps_dashboard_read ON core.attachments FOR SELECT TO wonderapps_dashboard USING (true);

-- core.export_jobs: activity (no filters, file name or path)
GRANT SELECT (business_id, requested_by, created_at) ON core.export_jobs TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON core.export_jobs;
CREATE POLICY wonderapps_dashboard_read ON core.export_jobs FOR SELECT TO wonderapps_dashboard USING (true);

-- core.parties: funnel: first record (existence only)
GRANT SELECT (business_id) ON core.parties TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON core.parties;
CREATE POLICY wonderapps_dashboard_read ON core.parties FOR SELECT TO wonderapps_dashboard USING (true);

-- core.items: funnel: first record (existence only)
GRANT SELECT (business_id) ON core.items TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON core.items;
CREATE POLICY wonderapps_dashboard_read ON core.items FOR SELECT TO wonderapps_dashboard USING (true);

-- core.ai_runs: AI runs, cost, failure rate
GRANT SELECT (business_id, provider, status, estimated_cost, created_at) ON core.ai_runs TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON core.ai_runs;
CREATE POLICY wonderapps_dashboard_read ON core.ai_runs FOR SELECT TO wonderapps_dashboard USING (true);

-- core.ai_provider_credentials: bring-your-own-key adoption (encrypted key and fingerprint are NOT granted)
GRANT SELECT (business_id, status) ON core.ai_provider_credentials TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON core.ai_provider_credentials;
CREATE POLICY wonderapps_dashboard_read ON core.ai_provider_credentials FOR SELECT TO wonderapps_dashboard USING (true);

-- core.domain_events: failed / stuck events (payload and error text are NOT granted)
GRANT SELECT (business_id, status, next_attempt_at) ON core.domain_events TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON core.domain_events;
CREATE POLICY wonderapps_dashboard_read ON core.domain_events FOR SELECT TO wonderapps_dashboard USING (true);

-- inventory.stock_movements: activity and actions per day
GRANT SELECT (business_id, created_by, created_at) ON inventory.stock_movements TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON inventory.stock_movements;
CREATE POLICY wonderapps_dashboard_read ON inventory.stock_movements FOR SELECT TO wonderapps_dashboard USING (true);

-- inventory.stock_transfers: activity
GRANT SELECT (business_id, requested_by, created_at) ON inventory.stock_transfers TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON inventory.stock_transfers;
CREATE POLICY wonderapps_dashboard_read ON inventory.stock_transfers FOR SELECT TO wonderapps_dashboard USING (true);

-- fsm.jobs: service jobs and activity
GRANT SELECT (business_id, created_by, created_at) ON fsm.jobs TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON fsm.jobs;
CREATE POLICY wonderapps_dashboard_read ON fsm.jobs FOR SELECT TO wonderapps_dashboard USING (true);

-- fsm.opportunities: activity
GRANT SELECT (business_id, created_by, created_at) ON fsm.opportunities TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON fsm.opportunities;
CREATE POLICY wonderapps_dashboard_read ON fsm.opportunities FOR SELECT TO wonderapps_dashboard USING (true);

-- fsm.notes: activity (note body is NOT granted)
GRANT SELECT (business_id, author_id, created_at) ON fsm.notes TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON fsm.notes;
CREATE POLICY wonderapps_dashboard_read ON fsm.notes FOR SELECT TO wonderapps_dashboard USING (true);

-- fsm.events: activity
GRANT SELECT (business_id, created_by, created_at) ON fsm.events TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON fsm.events;
CREATE POLICY wonderapps_dashboard_read ON fsm.events FOR SELECT TO wonderapps_dashboard USING (true);

-- crm.crm_note: activity (note body is NOT granted)
GRANT SELECT (business_id, author_id, created_at) ON crm.crm_note TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON crm.crm_note;
CREATE POLICY wonderapps_dashboard_read ON crm.crm_note FOR SELECT TO wonderapps_dashboard USING (true);

-- crm.lead: funnel: first record (existence only)
GRANT SELECT (business_id) ON crm.lead TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON crm.lead;
CREATE POLICY wonderapps_dashboard_read ON crm.lead FOR SELECT TO wonderapps_dashboard USING (true);

-- crm.interaction: inbox message counts (no content, sender or party)
GRANT SELECT (business_id, occurred_at) ON crm.interaction TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON crm.interaction;
CREATE POLICY wonderapps_dashboard_read ON crm.interaction FOR SELECT TO wonderapps_dashboard USING (true);

-- crm.channel_connection: broken channel connections (no tokens, no account ids)
GRANT SELECT (business_id, status) ON crm.channel_connection TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON crm.channel_connection;
CREATE POLICY wonderapps_dashboard_read ON crm.channel_connection FOR SELECT TO wonderapps_dashboard USING (true);

-- discovery.products: maps a Discovery workspace to its business
GRANT SELECT (id, business_id) ON discovery.products TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON discovery.products;
CREATE POLICY wonderapps_dashboard_read ON discovery.products FOR SELECT TO wonderapps_dashboard USING (true);

-- discovery.workspaces: maps a Discovery workspace to its business
GRANT SELECT (id, product_id) ON discovery.workspaces TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON discovery.workspaces;
CREATE POLICY wonderapps_dashboard_read ON discovery.workspaces FOR SELECT TO wonderapps_dashboard USING (true);

-- discovery.prospects: funnel and feature use (existence only; no company data)
GRANT SELECT (workspace_id) ON discovery.prospects TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON discovery.prospects;
CREATE POLICY wonderapps_dashboard_read ON discovery.prospects FOR SELECT TO wonderapps_dashboard USING (true);

-- discovery.prospect_scores: prospects scored
GRANT SELECT (workspace_id, prospect_id, created_at) ON discovery.prospect_scores TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON discovery.prospect_scores;
CREATE POLICY wonderapps_dashboard_read ON discovery.prospect_scores FOR SELECT TO wonderapps_dashboard USING (true);

-- discovery.chat_messages: activity (message content is NOT granted)
GRANT SELECT (workspace_id, role, created_at) ON discovery.chat_messages TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON discovery.chat_messages;
CREATE POLICY wonderapps_dashboard_read ON discovery.chat_messages FOR SELECT TO wonderapps_dashboard USING (true);

-- discovery.prospect_feedback: activity (tag and note are NOT granted)
GRANT SELECT (workspace_id, created_at) ON discovery.prospect_feedback TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON discovery.prospect_feedback;
CREATE POLICY wonderapps_dashboard_read ON discovery.prospect_feedback FOR SELECT TO wonderapps_dashboard USING (true);

-- discovery.offering_feedback: activity (values are NOT granted)
GRANT SELECT (workspace_id, created_at) ON discovery.offering_feedback TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON discovery.offering_feedback;
CREATE POLICY wonderapps_dashboard_read ON discovery.offering_feedback FOR SELECT TO wonderapps_dashboard USING (true);

-- discovery.marketing_campaigns: activity and feature use
GRANT SELECT (business_id, created_by, created_at) ON discovery.marketing_campaigns TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON discovery.marketing_campaigns;
CREATE POLICY wonderapps_dashboard_read ON discovery.marketing_campaigns FOR SELECT TO wonderapps_dashboard USING (true);

-- discovery.marketing_content: activity and feature use (body is NOT granted)
GRANT SELECT (business_id, created_by, created_at) ON discovery.marketing_content TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON discovery.marketing_content;
CREATE POLICY wonderapps_dashboard_read ON discovery.marketing_content FOR SELECT TO wonderapps_dashboard USING (true);

-- discovery.investor_interactions: activity (subject and notes are NOT granted)
GRANT SELECT (business_id, created_by, created_at) ON discovery.investor_interactions TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON discovery.investor_interactions;
CREATE POLICY wonderapps_dashboard_read ON discovery.investor_interactions FOR SELECT TO wonderapps_dashboard USING (true);

-- discovery.funding_rounds: feature use (existence only; no amounts)
GRANT SELECT (business_id) ON discovery.funding_rounds TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON discovery.funding_rounds;
CREATE POLICY wonderapps_dashboard_read ON discovery.funding_rounds FOR SELECT TO wonderapps_dashboard USING (true);

-- discovery.investors: feature use (existence only; no investor data)
GRANT SELECT (business_id) ON discovery.investors TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON discovery.investors;
CREATE POLICY wonderapps_dashboard_read ON discovery.investors FOR SELECT TO wonderapps_dashboard USING (true);

-- discovery.website_onboarding_runs: feature use (no website or profile)
GRANT SELECT (business_id, status) ON discovery.website_onboarding_runs TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON discovery.website_onboarding_runs;
CREATE POLICY wonderapps_dashboard_read ON discovery.website_onboarding_runs FOR SELECT TO wonderapps_dashboard USING (true);

-- discovery.ai_runs: AI runs, cost, failure rate
GRANT SELECT (workspace_id, provider, status, estimated_cost, created_at) ON discovery.ai_runs TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON discovery.ai_runs;
CREATE POLICY wonderapps_dashboard_read ON discovery.ai_runs FOR SELECT TO wonderapps_dashboard USING (true);

-- discovery.ai_provider_credentials: bring-your-own-key adoption (encrypted key and fingerprint are NOT granted)
GRANT SELECT (account_id, status) ON discovery.ai_provider_credentials TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON discovery.ai_provider_credentials;
CREATE POLICY wonderapps_dashboard_read ON discovery.ai_provider_credentials FOR SELECT TO wonderapps_dashboard USING (true);

-- gst.journal_entries: posted entries and activity (no memo or source ids)
GRANT SELECT (business_id, created_by, status, created_at) ON gst.journal_entries TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON gst.journal_entries;
CREATE POLICY wonderapps_dashboard_read ON gst.journal_entries FOR SELECT TO wonderapps_dashboard USING (true);

-- gst.return_periods: returns filed (no snapshot, reference or payment data)
GRANT SELECT (business_id, status, filed_at, updated_at) ON gst.return_periods TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON gst.return_periods;
CREATE POLICY wonderapps_dashboard_read ON gst.return_periods FOR SELECT TO wonderapps_dashboard USING (true);

-- gst.einvoices: e-invoices generated (no IRN, QR or response)
GRANT SELECT (business_id, created_at) ON gst.einvoices TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON gst.einvoices;
CREATE POLICY wonderapps_dashboard_read ON gst.einvoices FOR SELECT TO wonderapps_dashboard USING (true);

-- gst.finance_exceptions: open exceptions (no summary or reference)
GRANT SELECT (business_id, status) ON gst.finance_exceptions TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON gst.finance_exceptions;
CREATE POLICY wonderapps_dashboard_read ON gst.finance_exceptions FOR SELECT TO wonderapps_dashboard USING (true);

-- gst.reconciliation_exceptions: open exceptions (no summary or reference)
GRANT SELECT (business_id, status) ON gst.reconciliation_exceptions TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON gst.reconciliation_exceptions;
CREATE POLICY wonderapps_dashboard_read ON gst.reconciliation_exceptions FOR SELECT TO wonderapps_dashboard USING (true);

-- platform.subscriptions: paying businesses, trials, MRR/ARR (no provider customer or subscription ids)
GRANT SELECT (business_id, provider, environment, status, billing_interval, currency, amount) ON platform.subscriptions TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON platform.subscriptions;
CREATE POLICY wonderapps_dashboard_read ON platform.subscriptions FOR SELECT TO wonderapps_dashboard USING (true);

-- platform.billing_payments: revenue collected (no invoice number, description, provider ids)
GRANT SELECT (business_id, environment, currency, status, amount, tax_amount, refunded_amount, paid_at) ON platform.billing_payments TO wonderapps_dashboard;
DROP POLICY IF EXISTS wonderapps_dashboard_read ON platform.billing_payments;
CREATE POLICY wonderapps_dashboard_read ON platform.billing_payments FOR SELECT TO wonderapps_dashboard USING (true);
