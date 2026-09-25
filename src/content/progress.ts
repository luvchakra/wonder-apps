/**
 * The portfolio engineering tracker (/appstracker). Every number here is
 * copied from the four products' own tracking documents in their public
 * repositories on the date noted per product — never computed from a guess,
 * never rounded up. Re-sync by re-reading each `sourceUrl` below.
 *
 * Row shape is normalized across four differently-structured trackers:
 *   - WonderHome groups by 24 backlog "modules" (docs/PROGRESS.md, generated)
 *   - WonderJobs groups by 15 "epics" (docs/PROGRESS.md)
 *   - WonderArk groups by 5 backlog documents (docs/PROGRESS-TRACKER.md, generated)
 *   - WonderAgent groups by 11 module "agents" (docs/PROGRESS.md, generated)
 * `setAside` means deliberately descoped or superseded by later work — not
 * abandoned and not simply "not done" — and is called out as such in the UI.
 */

export type ProgressRow = {
  id: string;
  name: string;
  total: number;
  done: number;
  partial: number;
  notStarted: number;
  setAside: number;
  status: string;
  note?: string;
};

export type ProductProgress = {
  slug: string;
  name: string;
  accent: string;
  stage: string;
  currentFocus: string;
  lastUpdated: string;
  sourceLabel: string;
  sourceUrl: string;
  rowLabel: string;
  methodology: string;
  rows: ProgressRow[];
};

function sum(rows: ProgressRow[], key: keyof Pick<ProgressRow, "total" | "done" | "partial" | "notStarted" | "setAside">) {
  return rows.reduce((n, r) => n + r[key], 0);
}

export const productProgress: ProductProgress[] = [
  {
    slug: "wonderhome",
    name: "WonderHome",
    accent: "oklch(0.49 0.09 190)",
    stage: "Live product · early households onboarding",
    currentFocus: "Module 22 — Internationalization & Localization (translation catalog coverage, multi-currency, RTL); module 20's payment operations (20-011) is the other open item",
    lastUpdated: "2026-09-25",
    sourceLabel: "docs/PROGRESS.md (generated)",
    sourceUrl: "https://github.com/luvchakra/wonder-home/blob/main/docs/PROGRESS.md",
    rowLabel: "Backlog module",
    methodology:
      "225 stories across 24 modules, tagged P0/P1/P2 at design time. A module's remaining stories are a mix of not-started and in-progress work not split out in the source tracker, so they're counted together here as “remaining.”",
    rows: [
      { id: "00", name: "Project Bootstrap & Architecture", total: 10, done: 10, partial: 0, notStarted: 0, setAside: 0, status: "Done" },
      { id: "01", name: "Identity & Family Accounts", total: 9, done: 9, partial: 0, notStarted: 0, setAside: 0, status: "Done" },
      { id: "02", name: "Household Configuration & Playbook", total: 9, done: 9, partial: 0, notStarted: 0, setAside: 0, status: "Done" },
      { id: "03", name: "Outcome & Routine Engine", total: 8, done: 8, partial: 0, notStarted: 0, setAside: 0, status: "Done" },
      { id: "04", name: "Conversation, Voice & Text", total: 17, done: 16, partial: 0, notStarted: 1, setAside: 0, status: "In Progress", note: "Multi-channel HomeTalk (web, Gemini Live, Alexa) code-complete; only voice evaluation/release gates remain" },
      { id: "05", name: "Household Certification & Understanding", total: 8, done: 8, partial: 0, notStarted: 0, setAside: 0, status: "Done" },
      { id: "06", name: "Actionable Notification Engine", total: 8, done: 8, partial: 0, notStarted: 0, setAside: 0, status: "Done" },
      { id: "07", name: "Househelper & Home Operations", total: 8, done: 8, partial: 0, notStarted: 0, setAside: 0, status: "Done" },
      { id: "08", name: "Kids & School Intelligence", total: 9, done: 9, partial: 0, notStarted: 0, setAside: 0, status: "Done" },
      { id: "09", name: "Commerce, Groceries & Pet Supplies", total: 9, done: 9, partial: 0, notStarted: 0, setAside: 0, status: "Done" },
      { id: "10", name: "Meals & Cooking", total: 8, done: 8, partial: 0, notStarted: 0, setAside: 0, status: "Done" },
      { id: "11", name: "Bills, Fees & Finance", total: 8, done: 8, partial: 0, notStarted: 0, setAside: 0, status: "Done" },
      { id: "12", name: "Family Time & Social Activities", total: 8, done: 8, partial: 0, notStarted: 0, setAside: 0, status: "Done" },
      { id: "13", name: "Maintenance, Laundry & Pet Care", total: 8, done: 8, partial: 0, notStarted: 0, setAside: 0, status: "Done" },
      { id: "14", name: "AI Orchestration & Learning", total: 19, done: 19, partial: 0, notStarted: 0, setAside: 0, status: "Done", note: "Grew from 14 to 19 stories this cycle: WhatsApp intake, and whole-document reading with a review/apply/receipt flow" },
      { id: "15", name: "Privacy, Security & Governance", total: 8, done: 8, partial: 0, notStarted: 0, setAside: 0, status: "Done" },
      { id: "16", name: "Platform Admin & Operations", total: 8, done: 8, partial: 0, notStarted: 0, setAside: 0, status: "Done" },
      { id: "17", name: "External Integrations", total: 8, done: 8, partial: 0, notStarted: 0, setAside: 0, status: "Done" },
      { id: "18", name: "API & Developer Platform", total: 8, done: 7, partial: 0, notStarted: 1, setAside: 0, status: "In Progress" },
      { id: "19", name: "Testing, Observability & Production", total: 8, done: 8, partial: 0, notStarted: 0, setAside: 0, status: "Done" },
      { id: "20", name: "Subscriptions, Entitlements & Usage", total: 11, done: 10, partial: 0, notStarted: 1, setAside: 0, status: "In Progress", note: "Grew from 8 to 11 stories: multi-provider billing (Razorpay + Stripe) and plan/checkout screens now code-complete; only payment operations (refunds, reconciliation) remain" },
      { id: "21", name: "Health & Fitness", total: 8, done: 8, partial: 0, notStarted: 0, setAside: 0, status: "Done" },
      { id: "22", name: "Internationalization & Localization", total: 8, done: 5, partial: 0, notStarted: 3, setAside: 0, status: "In Progress", note: "7-language catalog, HomeTalk and screen coverage shipped; multi-currency records and right-to-left readiness still open" },
      { id: "23", name: "Smart Notifications", total: 12, done: 12, partial: 0, notStarted: 0, setAside: 0, status: "Done", note: "Notification center, snooze, escalation, smart batching and behaviour-learned timing all shipped this cycle" },
    ],
  },
  {
    slug: "wonderjobs",
    name: "WonderJobs",
    accent: "oklch(0.55 0.23 285)",
    stage: "Live product · free plan · public demo",
    currentFocus: "Epic 13 — secondary product areas (Resume Studio, Interview Prep going deeper)",
    lastUpdated: "2026-09-20",
    sourceLabel: "docs/PROGRESS.md",
    sourceUrl: "https://github.com/luvchakra/wonder-jobs/blob/main/docs/PROGRESS.md",
    rowLabel: "Epic",
    methodology:
      "Every story from the original requirements spec plus later requests, tracked epic by epic. “Partial” means shipped but intentionally incomplete (e.g. an early version); “backlog” items are listed by name in the source doc.",
    rows: [
      { id: "1", name: "Foundation & design system", total: 5, done: 5, partial: 0, notStarted: 0, setAside: 0, status: "Done" },
      { id: "2", name: "Accounts & sessions", total: 10, done: 8, partial: 0, notStarted: 2, setAside: 0, status: "In Progress", note: "Google sign-in needs provider config; custom SMTP recommended" },
      { id: "3", name: "Onboarding & Career DNA", total: 4, done: 4, partial: 0, notStarted: 0, setAside: 0, status: "Done" },
      { id: "4", name: "Job discovery (real sources)", total: 9, done: 7, partial: 0, notStarted: 2, setAside: 0, status: "Done" },
      { id: "5", name: "Matching, quality & explanations", total: 4, done: 4, partial: 0, notStarted: 0, setAside: 0, status: "Done" },
      { id: "6", name: "Run Wonder (workflow engine)", total: 10, done: 10, partial: 0, notStarted: 0, setAside: 0, status: "Done" },
      { id: "7", name: "Applications & materials", total: 7, done: 6, partial: 0, notStarted: 1, setAside: 0, status: "Done" },
      { id: "8", name: "Automation & scheduling", total: 8, done: 7, partial: 1, notStarted: 0, setAside: 0, status: "In Progress", note: "Cron cadence capped by the Vercel plan" },
      { id: "9", name: "AI providers (BYOK + platform)", total: 9, done: 8, partial: 0, notStarted: 1, setAside: 0, status: "Done" },
      { id: "10", name: "Persistence & sync", total: 4, done: 4, partial: 0, notStarted: 0, setAside: 0, status: "Done" },
      { id: "11", name: "Landing & marketing site", total: 12, done: 12, partial: 0, notStarted: 0, setAside: 0, status: "Done" },
      { id: "12", name: "Help center & support", total: 6, done: 6, partial: 0, notStarted: 0, setAside: 0, status: "Done" },
      { id: "13", name: "Secondary product areas", total: 13, done: 8, partial: 3, notStarted: 2, setAside: 0, status: "In Progress", note: "Resume Studio and Interview Prep are early versions" },
      { id: "14", name: "Quality, accessibility, performance", total: 11, done: 10, partial: 0, notStarted: 1, setAside: 0, status: "Done" },
      { id: "15", name: "Operations & release", total: 7, done: 5, partial: 0, notStarted: 2, setAside: 0, status: "In Progress" },
    ],
  },
  {
    slug: "wonderark",
    name: "WonderArk",
    accent: "oklch(0.546 0.215 260)",
    stage: "Live platform · modules rolling out",
    currentFocus: "Global tax compliance (VAT/GST expansion beyond India) and the platform administration portal",
    lastUpdated: "2026-09-20",
    sourceLabel: "docs/PROGRESS-TRACKER.md (generated)",
    sourceUrl: "https://github.com/luvchakra/founder-collab/blob/main/docs/PROGRESS-TRACKER.md",
    rowLabel: "Backlog",
    methodology:
      "Generated from the repository itself: a story counts as done only when its id is cited by the code, migration or test that implements it. “Set aside” stories were deliberately descoped or superseded by later work, not abandoned — the whole 30-story “opportunity intelligence” backlog was superseded by the “offering-centric” backlog that followed it.",
    rows: [
      { id: "04", name: "Platform build-out (core, tenancy, licensing, Inventory, Service, Finance foundations)", total: 65, done: 55, partial: 0, notStarted: 9, setAside: 1, status: "In Progress" },
      { id: "09", name: "Platform Administration Portal", total: 110, done: 79, partial: 0, notStarted: 31, setAside: 0, status: "In Progress" },
      { id: "10", name: "Discovery — offering-centric upgrade", total: 58, done: 51, partial: 0, notStarted: 7, setAside: 0, status: "In Progress" },
      { id: "08", name: "Discovery — opportunity intelligence", total: 30, done: 0, partial: 0, notStarted: 0, setAside: 30, status: "Superseded", note: "Fully superseded by backlog 10 (offering-centric); no story here is abandoned work" },
      { id: "11", name: "Compliance / Finance — global tax", total: 128, done: 87, partial: 0, notStarted: 41, setAside: 0, status: "In Progress", note: "India GST is done; VAT/GST for UAE, Saudi Arabia, Australia, NZ and Southeast Asia is the remaining scope" },
    ],
  },
  {
    slug: "wonderagent",
    name: "WonderAgent",
    accent: "oklch(0.546 0.215 260)",
    stage: "Live multi-tenant platform · P0 complete in every module",
    currentFocus: "QA Agent's hardening pass (45% of its 22 stories) — its E2E suite is blocked on two Preview-environment secrets, not code",
    lastUpdated: "2026-09-19",
    sourceLabel: "docs/PROGRESS.md (generated)",
    sourceUrl: "https://github.com/luvchakra/wonder-agent/blob/main/docs/PROGRESS.md",
    rowLabel: "Module (agent)",
    methodology:
      "Generated from the per-module backlog tables. “Deferred” rows are named, reasoned decisions recorded in the module's own backlog (e.g. a hard infrastructure limit), not silent gaps. Beyond these tracked stories, the backlogs list 52 forward-looking P1 and 32 P2 items not yet in scope.",
    rows: [
      { id: "01", name: "Foundation — auth, tenancy, security, RBAC", total: 29, done: 27, partial: 2, notStarted: 0, setAside: 0, status: "In Progress", note: "SSO/MFA code paths done and RLS-verified; a live IdP handshake needs a non-sandboxed environment" },
      { id: "02", name: "Identity — AI agent registration & lifecycle", total: 11, done: 11, partial: 0, notStarted: 0, setAside: 0, status: "Done" },
      { id: "03", name: "Integration — connectors, Saviynt, MCP, webhooks", total: 12, done: 11, partial: 1, notStarted: 0, setAside: 0, status: "In Progress", note: "Saviynt adapter verified against the API reference; field names unconfirmed against a live tenant" },
      { id: "04", name: "Access — effective access & governance", total: 11, done: 11, partial: 0, notStarted: 0, setAside: 0, status: "Done" },
      { id: "05", name: "Runtime — SHOULD/CAN/DID assurance", total: 9, done: 9, partial: 0, notStarted: 0, setAside: 0, status: "Done" },
      { id: "06", name: "Risk — deterministic scoring & rogue detection", total: 13, done: 12, partial: 1, notStarted: 0, setAside: 0, status: "In Progress", note: "Risk-score persistence now live; 3 of 4 deterministic risk factors still stubbed at zero pending other modules' contracts" },
      { id: "07", name: "Compliance — certification & controls", total: 13, done: 13, partial: 0, notStarted: 0, setAside: 0, status: "Done" },
      { id: "08", name: "Experience — customer UI/UX", total: 21, done: 19, partial: 2, notStarted: 0, setAside: 0, status: "In Progress", note: "Core primitives built and proven; full rollout across every domain screen ongoing" },
      { id: "09", name: "Platform — vendor administration console", total: 13, done: 12, partial: 0, notStarted: 0, setAside: 1, status: "In Progress", note: "Support-access tooling and AI provider configuration are open product questions, deliberately not shortcut" },
      { id: "10", name: "Operations — audit, reporting, notifications, search", total: 11, done: 10, partial: 1, notStarted: 0, setAside: 0, status: "In Progress", note: "All 7 notification event types now wired; only gap is that every P0 notification type is mandatory, so there's no optional preference to toggle yet" },
      { id: "11", name: "QA — integration, security & production hardening", total: 22, done: 10, partial: 12, notStarted: 0, setAside: 0, status: "In Progress", note: "Its browser-driven E2E suite is proven against production but blocked on Preview env vars (SUPABASE_SERVICE_ROLE_KEY, SECRET_ENCRYPTION_KEY) — a credentials gap, not a code gap" },
    ],
  },
];

export type PortfolioTotals = {
  total: number;
  done: number;
  partial: number;
  notStarted: number;
  setAside: number;
  activeCompletionPct: number;
};

export function totalsFor(rows: ProgressRow[]): PortfolioTotals {
  const total = sum(rows, "total");
  const done = sum(rows, "done");
  const partial = sum(rows, "partial");
  const notStarted = sum(rows, "notStarted");
  const setAside = sum(rows, "setAside");
  const activeTotal = total - setAside;
  return { total, done, partial, notStarted, setAside, activeCompletionPct: activeTotal > 0 ? Math.round((done / activeTotal) * 100) : 0 };
}

export function portfolioTotals(): PortfolioTotals & { products: number } {
  const rows = productProgress.flatMap((p) => p.rows);
  return { ...totalsFor(rows), products: productProgress.length };
}
