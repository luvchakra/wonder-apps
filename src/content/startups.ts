import type { Startup } from "./types";

/**
 * Everything the portfolio says about each product lives here. Sources are the
 * live sites and the products' own engineering trackers (September 2026). Keep
 * claims verifiable: build progress, shipped features and stated plan shapes —
 * never invented customer counts or revenue.
 */
export const startups: Startup[] = [
  {
    slug: "wonderhome",
    name: "WonderHome",
    tagline: "Happier Homes. Brighter Tomorrows.",
    oneLiner:
      "An AI household operating system that manages the management — so families spend less time coordinating and more time together.",
    category: "Consumer · Family AI",
    audience: "Busy families with children, school, bills, help and a home to run",
    geography: "India-first, built for global households",
    stage: "Live product · early households onboarding",
    url: "https://wonderhome.vercel.app/",
    helpUrl: "https://wonderhome.vercel.app/help",
    accent: "oklch(0.49 0.09 190)",
    accentSoft: "oklch(0.93 0.03 190)",
    hero: {
      headline: "A calmer home is possible.",
      sub: "WonderHome watches the whole household — school, meals, groceries, bills, help, pets, family time — and interrupts the right person only when a decision is genuinely needed.",
    },
    problem: {
      title: "The management of life can consume the life itself.",
      lede: "Modern family life is beautiful, but it is a lot. Every existing tool adds another list for one parent — usually the same parent — to maintain.",
      points: [
        { title: "Invisible mental load", body: "Tasks, schedules, bills, shopping and school information never end, and they land disproportionately on one person." },
        { title: "Tools that add work", body: "Shared calendars, to-do apps and family chat groups all need feeding. None of them notice what is slipping." },
        { title: "Decisions at the wrong moment", body: "A bill is noticed when it is overdue. A science project is discovered the night before. Dinner is a question at 7 pm." },
        { title: "Trust is the barrier", body: "Families will not hand a home to software that acts without asking, or that treats children like adults." },
      ],
    },
    solution: {
      title: "It manages the management.",
      lede: "WonderHome does not give a family more things to manage. It holds household outcomes, resolves routine work where the family's policy permits, and asks — clearly, with a plan — before anything consequential.",
      pillars: [
        { title: "Outcomes, not chores", body: "A meal is 'ready by 8 pm', a bill is 'paid before the consequence', homework is 'finished with time to spare'. The system plans backwards from the outcome." },
        { title: "Asks before it acts", body: "Every consequential action shows what it understood, what it plans and the impact — with Confirm, Change and Cancel. Payments, deletions and access changes always ask." },
        { title: "Whole-household coverage", body: "Family & profiles, Today, School, Groceries, Meals, Bills, Househelper, Maintenance, Laundry, Pet care and Family time — one place, one assistant, text or voice." },
        { title: "Private by design", body: "Tenant isolation is enforced in the database, children get age-appropriate views, and household data is never training data." },
      ],
    },
    howItWorks: [
      { step: "Observe", body: "Connected calendars, school portals, email and the family's own words tell WonderHome what is happening." },
      { step: "Understand & Plan", body: "Outcomes are checked against time, people and stock. A plan is drafted only when something is at risk." },
      { step: "Act (with consent)", body: "Routine work resolves silently within policy. Anything consequential returns as a plan the family confirms." },
      { step: "Monitor & Learn", body: "Notifications are sparse, threaded and resolve themselves. The household's preferences shape what comes next." },
    ],
    screens: [
      { src: "/screenshots/wonderhome/home-desktop.webp", alt: "WonderHome landing page on desktop showing the hero 'A calmer home is possible' and a household dashboard preview", kind: "desktop", caption: "The product site — same design language as the app" },
      { src: "/screenshots/wonderhome/home-mobile.webp", alt: "WonderHome on a phone, showing the mobile hero and Today view", kind: "mobile", caption: "Installs like an app on iPhone and Android" },
      { src: "/screenshots/wonderhome/features-desktop.webp", alt: "WonderHome features section listing the household domains", kind: "desktop", caption: "Every feature is a household outcome" },
      { src: "/screenshots/wonderhome/pricing-mobile.webp", alt: "WonderHome plans on a phone: Free, Pro and Max", kind: "mobile", caption: "Three plans, from a quiet watcher to a home that runs itself" },
      { src: "/screenshots/wonderhome/security-desktop.webp", alt: "WonderHome security section: private by default, tenant isolation, child privacy, governed AI", kind: "desktop", caption: "Private by default — security as a family feature" },
    ],
    market: {
      title: "Every family is a household to run.",
      lede: "Dual-income, multi-generational homes with school-age children, domestic help and dense admin are the norm across India's metros and a fast-growing share of homes worldwide. They already pay for convenience — delivery, tutoring, help — but nobody sells them coordination.",
      segments: ["Urban dual-income families with school-age children", "Multi-generational households coordinating help and care", "Expat and NRI families running homes across time zones"],
      whyNow: [
        "Assistants that can plan and act — not just answer — became reliable enough to run background loops in 2025–26.",
        "Household commerce, school portals and calendars all now have programmatic surfaces to observe and act on.",
        "Consumer trust hinges on consent-first design; WonderHome's governed-tool architecture is built for exactly that.",
      ],
    },
    businessModel: {
      title: "Consumer subscription with a governed path to commerce.",
      lede: "Plans are data, not code: Free, Pro and Max are rows in a live catalogue with server-side entitlements and atomic usage metering already shipped. Commerce and bill flows are designed with idempotent, approval-gated execution — the foundation for transaction revenue later.",
      plans: [
        { name: "Free", tagline: "Run the Home", bullets: ["Household basics with WonderHome watching quietly", "Outcomes, routines, notifications", "Maintenance, laundry, pet care", "Text conversation and background runs"] },
        { name: "Pro", tagline: "Let WonderHome Think", featured: true, bullets: ["The full household: school, commerce, meals, bills, family time", "Voice conversation", "School and homework intelligence", "Ordering and groceries"] },
        { name: "Max", tagline: "Let WonderHome Run the Home", bullets: ["Everything, with autonomous action", "Deeper integrations", "Highest usage limits"] },
      ],
    },
    moat: [
      { title: "Consent architecture", body: "Deterministic policy checks sit outside the model. Autonomy is set per household, per responsibility. This is hard to bolt on and is the reason families will let it act." },
      { title: "Household graph", body: "People, guardianship, protected time, stock levels, obligations and preferences form a private, compounding model of one home." },
      { title: "Cost discipline", body: "Engineering guardrails target under US$2,000/month infrastructure at 10,000 active households and under US$0.75 of background AI per household per month." },
    ],
    traction: [
      { label: "Stories shipped", value: "132 / 170", note: "77.6% of a 21-module backlog, per the live tracker" },
      { label: "Modules complete", value: "8 of 21", note: "Conversation, School, Commerce, Meals, Bills, Family time, Maintenance & Pet care, Bootstrap" },
      { label: "Connectors live", value: "Calendar · Email · School", note: "On one shared connector contract; commerce adapter in progress" },
      { label: "Scale target", value: "25,000 households", note: "99.9% availability, p95 ≤ 500 ms API — initial engineering targets" },
    ],
    roadmap: [
      { horizon: "Now", items: ["Commerce connector for live grocery ordering", "Household certification & understanding", "Privacy, security and governance stories to 8/8"] },
      { horizon: "Next", items: ["Upgrade/downgrade and billing abstraction", "Platform admin and operations", "Public API and developer platform"] },
      { horizon: "Later", items: ["Payment provider integration under step-up approval", "Quota automation and plan experiments", "Regional expansion beyond India"] },
    ],
    ask: "Seeking design-partner families and early-stage investors who believe the household is the next operating system.",
    facts: [
      { label: "Platform", value: "Web · PWA · iPhone · Android · Desktop" },
      { label: "AI", value: "Anthropic Claude primary; Gemini and OpenAI supported; BYOK" },
      { label: "Data", value: "Supabase PostgreSQL, RLS per household, ap-south-1" },
      { label: "Pricing", value: "Free · Pro · Max (no card for Free)" },
    ],
  },
  {
    slug: "wonderjobs",
    name: "WonderJobs",
    tagline: "Find. Grow. Belong.",
    oneLiner:
      "An AI career agent that searches real job sources, explains every match, prepares every application — and leaves the decisions to the candidate.",
    category: "Consumer · Career AI agent",
    audience: "Job seekers, career switchers, students and senior professionals",
    geography: "Global remote-first sources plus India via Adzuna",
    stage: "Live product · free plan · public demo",
    url: "https://wonderjobs.vercel.app/",
    helpUrl: "https://wonderjobs.vercel.app/help",
    accent: "oklch(0.55 0.23 285)",
    accentSoft: "oklch(0.94 0.04 285)",
    logo: { light: "/brands/wonderjobs/wonderjobs-logo-light.webp", dark: "/brands/wonderjobs/wonderjobs-logo-dark.webp", mark: "/brands/wonderjobs/wonder-mark.webp" },
    hero: {
      headline: "Your next opportunity is out there. Wonder finds it.",
      sub: "WonderJobs scans live sources, removes duplicates, scores every posting against a candidate's Career DNA and drafts tailored materials — then hands the application to the human. It never applies on anyone's behalf.",
    },
    problem: {
      title: "Job searching is a full-time job. It shouldn't be.",
      lede: "Candidates spend evenings re-typing the same details into the same forms, scanning the same boards and guessing whether a role is worth it.",
      points: [
        { title: "Repetition without signal", body: "The same listing appears on six boards. The same résumé is rewritten for the tenth time. None of it tells the candidate where they actually fit." },
        { title: "Opaque matching", body: "Boards rank by recency or by who paid. A candidate cannot see why a role appeared, or how strong the fit really is." },
        { title: "Automation that overreaches", body: "Auto-apply tools submit on the candidate's behalf, damaging reputation with employers and violating platform terms." },
        { title: "Ghost listings and noise", body: "Stale, duplicate and low-quality postings waste the scarcest resource a job seeker has: attention." },
      ],
    },
    solution: {
      title: "Search, analyse, prepare, track — with the candidate in control.",
      lede: "A run is an explicit twelve-stage state machine: understand the profile, search sources, remove duplicates, score fit, check quality, prioritise, prepare materials, wait for review, hand off, track and learn.",
      pillars: [
        { title: "Career DNA", body: "Goal, level, years, rated skills, industries, locations, minimum salary, strengths and growth areas. Every real posting is scored against it — and rescored when it changes." },
        { title: "Explainable fit", body: "Strong Opportunity (82+), Worth Considering (68+), Stretch (55+). Every score explains itself per dimension; quality signals use confidence language, never 'ghost job' claims." },
        { title: "Application prep, human hand-off", body: "Tailored résumé, cover letter and screening answers, with version compare and restore. The candidate reviews, edits and submits. Every external action is audited." },
        { title: "Your AI, your keys", body: "WonderJobs AI (Anthropic Claude) by default, or bring an Anthropic, OpenAI or Gemini key. Keys are AES-256-GCM encrypted, used only server-side, never returned." },
      ],
    },
    howItWorks: [
      { step: "Search", body: "Company career sites (Greenhouse, Lever, Ashby), Remotive, Jobicy, Remote OK, Himalayas, Arbeitnow and Adzuna India — live, server-side, cached 15 minutes." },
      { step: "Analyse", body: "A deterministic normaliser derives skills, seniority, industry, work mode and salary from each posting's own text, then scores it." },
      { step: "Prepare", body: "Materials are drafted per role and queued for review. Automation levels — Assist, Guided, Autonomous, Continuous — gate every capability." },
      { step: "Track", body: "Applications, follow-ups and interviews build a timeline, a calendar feed and insights that improve the next run." },
    ],
    screens: [
      { src: "/screenshots/wonderjobs/home-desktop.webp", alt: "WonderJobs landing page on desktop with the parallax hero and live run preview", kind: "desktop", caption: "Scroll-linked hero on the product site" },
      { src: "/screenshots/wonderjobs/jobs-desktop.webp", alt: "WonderJobs jobs list in demo mode with Wonder Fit labels and filters", kind: "desktop", caption: "Jobs view — every match explains itself" },
      { src: "/screenshots/wonderjobs/runs-mobile.webp", alt: "WonderJobs Wonder Runs screen on a phone showing stage-by-stage progress", kind: "mobile", caption: "A run's live stages on mobile" },
      { src: "/screenshots/wonderjobs/applications-desktop.webp", alt: "WonderJobs applications dashboard with status tabs and timeline", kind: "desktop", caption: "Applications tracker" },
      { src: "/screenshots/wonderjobs/career-dna-mobile.webp", alt: "WonderJobs Career DNA profile on a phone", kind: "mobile", caption: "Career DNA — the profile every score is measured against" },
      { src: "/screenshots/wonderjobs/home-mobile.webp", alt: "WonderJobs landing on a phone", kind: "mobile", caption: "Installable PWA" },
      { src: "/screenshots/wonderjobs/how-it-works-desktop.webp", alt: "WonderJobs how-it-works section: Search, Analyse, Prepare, Track", kind: "desktop", caption: "Search · Analyse · Prepare · Track" },
      { src: "/screenshots/wonderjobs/insights-desktop.webp", alt: "WonderJobs insights view in demo mode", kind: "desktop", caption: "Insights derived from real runs and applications" },
      { src: "/screenshots/wonderjobs/ai-mobile.webp", alt: "WonderJobs AI provider section on a phone: WonderJobs AI or bring your own Anthropic, OpenAI or Gemini key", kind: "mobile", caption: "Your AI, your keys" },
    ],
    market: {
      title: "Every active job seeker, every few years.",
      lede: "Job search is universal, recurring and painful. Incumbent boards monetise employers; the candidate side is under-served by tools that either spam or overreach. Remote-first hiring has widened the field a single person must scan.",
      segments: ["Knowledge workers searching remote and hybrid roles", "Career switchers who need fit explained, not assumed", "Students and early-career talent entering global markets", "Senior professionals managing a discreet, high-stakes search"],
      whyNow: [
        "Structured public job feeds and company ATS boards make honest, real-data search possible without scraping walled gardens.",
        "Language models draft credible, tailored materials — but only trustworthy when paired with deterministic matching and human approval.",
        "BYOK lets candidates pay their own AI bill, keeping the free tier genuinely free and gross margin high.",
      ],
    },
    businessModel: {
      title: "Free to search. Pro for depth and automation.",
      lede: "The free plan is real and the demo runs without an account. Pro is the natural upgrade for scheduled runs, deeper coaching and higher limits; billing is designed but not yet connected, so today 'Upgrade' records interest. BYOK means heavy users can bring their own inference cost.",
      plans: [
        { name: "Free", tagline: "Search and prepare", bullets: ["Real sources, explainable matching", "Application materials and tracker", "WonderJobs AI or bring your own key", "Installable on any device"] },
        { name: "Pro", tagline: "In development", featured: true, bullets: ["Scheduled runs with a server-side scheduler", "Deeper résumé coaching and mock interviews", "Higher usage limits", "Priority sources as they land"] },
      ],
    },
    moat: [
      { title: "Honesty as a feature", body: "Only sources actually searched are shown. Illustrative scenarios are labelled. Wonder never submits on an employer's site. Trust compounds where competitors burn it." },
      { title: "Deterministic core, generative edge", body: "Matching, ranking and quality checks are rule-based and unit-tested; language models only draft prose. Cheap, auditable and consistent." },
      { title: "Local-first, sync-second", body: "State hydrates locally and syncs per tenant in batches — fast on a phone, resilient offline, cheap to serve." },
    ],
    traction: [
      { label: "Epics complete", value: "11 / 15", note: "Remaining four are partial, with operator steps or provider config outstanding" },
      { label: "Live job sources", value: "7 families", note: "Greenhouse/Lever/Ashby boards across 20+ companies plus six aggregators" },
      { label: "Accessibility", value: "0 violations", note: "axe-core audit across 18 pages, reduced motion emulated" },
      { label: "Production", value: "Verified after each push", note: "Auth, demo, sources and per-user state checked on every release" },
    ],
    roadmap: [
      { horizon: "Now", items: ["Server-side scheduler so runs fire with the app closed", "Email delivery for follow-ups and thank-you notes", "Résumé import to pre-fill Career DNA"] },
      { horizon: "Next", items: ["Pro plan billing", "Two-way calendar sync", "Push notifications"] },
      { horizon: "Later", items: ["Additional regional sources", "Mock-interview AI and deeper coaching", "Platform admin for usage and key rotation"] },
    ],
    ask: "Seeking early-stage investors and distribution partners — universities, bootcamps and career services — who want candidates to have an agent of their own.",
    facts: [
      { label: "Platform", value: "Web · PWA · desktop, tablet, mobile" },
      { label: "AI", value: "Anthropic Claude (platform) · Anthropic / OpenAI / Gemini BYOK" },
      { label: "Data", value: "Supabase PostgreSQL, dedicated schema, RLS, service-role only" },
      { label: "Pricing", value: "Free today · Pro in development" },
    ],
  },
  {
    slug: "wonderark",
    name: "WonderArk",
    tagline: "Accelerate. Revenue. Knowledge.",
    oneLiner:
      "One login and one data model for a growing business: Discovery, Inventory, Service, CRM and GST Finance as independently licensed modules that never duplicate a customer, an item or an invoice.",
    category: "B2B · SMB operating platform",
    audience: "Growing businesses outgrowing spreadsheets and a pile of disconnected apps",
    geography: "India-first (GST-native), architecture is region-agnostic",
    stage: "Live platform · modules rolling out",
    url: "https://wonder-ark.vercel.app/",
    helpUrl: "https://wonder-ark.vercel.app/dashboard/help",
    accent: "oklch(0.546 0.215 260)",
    accentSoft: "oklch(0.93 0.03 260)",
    hero: {
      headline: "One login. Every part of your business. Zero duplicate data.",
      sub: "Five licensable modules on one shared data model — not five apps stitched together with exports. License what you need today; add a module later and it already knows your customers, items and team.",
    },
    problem: {
      title: "Growth turns into a pile of tools.",
      lede: "A business that starts on spreadsheets ends up with a CRM, an inventory app, a field-service tool, a chat inbox and a GST portal — five logins, five customer records, five inventory counts.",
      points: [
        { title: "Duplicate everything", body: "The same customer exists in the CRM, the invoicing tool and the WhatsApp inbox, with three different phone numbers." },
        { title: "Stock that disagrees", body: "The count in the inventory app never matches the parts a field crew actually used on a job." },
        { title: "Compliance by re-entry", body: "GST returns, e-invoices and e-way bills are re-keyed from sales data that already exists somewhere else." },
        { title: "Integration tax", body: "Every 'integration' is an export, an import and a person who owns the spreadsheet in between." },
      ],
    },
    solution: {
      title: "One portal. One account. Five modules. One truth.",
      lede: "A strictly bounded modular platform: a shared core schema owns every cross-module noun — parties, items, documents, payments, messages — and each module owns only what is genuinely its own.",
      pillars: [
        { title: "Discovery", body: "AI-generated ideal customer profiles, prospect discovery with fit and timing scores, why-them and why-now evidence, one-click hand-off to the pipeline. AI researches; humans approve every outreach." },
        { title: "Inventory & Service", body: "Multi-warehouse stock, purchase and sales orders, returns; opportunity-to-job pipeline, crew dispatch calendar, mobile field work with time, notes and signatures, and job invoicing that consumes stock." },
        { title: "CRM", body: "A unified inbox across WhatsApp, email and more, routing rules, lead lifecycle and a follow-up queue — tied to the same customer record every other module uses." },
        { title: "Finance & GST", body: "GSTIN management, e-way bills, e-invoicing and GST returns computed from actual sales data rather than re-entered." },
      ],
    },
    howItWorks: [
      { step: "Create the business once", body: "One signup, one login, one business record — or several businesses under one account." },
      { step: "License modules independently", body: "Start with one. Add or drop later. Cancelling never deletes data: a 30-day read-only grace, then rows are retained for reactivation." },
      { step: "Data connects automatically", body: "A prospect won in Discovery is the customer in Service. Parts consumed on a job move stock in Inventory. The invoice feeds GST." },
      { step: "Ask the platform", body: "A built-in assistant answers from live data across every module you have licensed, grounded in real records." },
    ],
    screens: [
      { src: "/screenshots/wonderark/home-desktop.webp", alt: "WonderArk landing page on desktop showing the five modules on one data model", kind: "desktop", caption: "The five modules on one shared data model" },
      { src: "/screenshots/wonderark/home-mobile.webp", alt: "WonderArk landing on a phone", kind: "mobile", caption: "Responsive across devices" },
      { src: "/screenshots/wonderark/modules-desktop.webp", alt: "WonderArk module detail section for Discovery, Inventory, Service, CRM and Finance", kind: "desktop", caption: "Module detail — independently licensable" },
      { src: "/screenshots/wonderark/pricing-mobile.webp", alt: "WonderArk pricing tiers on a phone", kind: "mobile", caption: "Free, Pro and Max" },
      { src: "/screenshots/wonderark/how-it-works-desktop.webp", alt: "WonderArk how-it-works: create the business once, license modules independently, data connects automatically", kind: "desktop", caption: "License what you need; add modules in place" },
    ],
    market: {
      title: "The mid-market between spreadsheets and SAP.",
      lede: "Businesses with a warehouse, a field crew, a sales pipeline and a tax identity — trades, distributors, installers, service companies — are too complex for a single-purpose app and too small for an enterprise suite. India's GST regime makes structured, compliant data non-optional.",
      segments: ["Field-service and installation businesses", "Distributors and traders managing multi-warehouse stock", "Founder-led B2B companies building their first pipeline", "Any GST-registered business filing from real sales data"],
      whyNow: [
        "E-invoicing and e-way bill mandates keep widening the set of businesses that must operate from clean, connected data.",
        "AI makes prospect research and multi-module querying practical for a business with no analyst.",
        "Modular licensing lets a customer start small and expand in place — the land-and-expand motion vertical SaaS lacks.",
      ],
    },
    businessModel: {
      title: "License by module. Expand in place.",
      lede: "Per-module subscriptions with a bundle at the top. Enforcement is four layers deep — RLS, route guard, server action and UI — so an unlicensed module is genuinely off, not merely hidden. Final per-module pricing is being finalised.",
      plans: [
        { name: "Free", tagline: "One business, one module", bullets: ["Core features of the module you choose", "Limited AI usage", "Community support"] },
        { name: "Pro", tagline: "Per-module licensing", featured: true, bullets: ["Full features of every module you license", "Automatic data sharing across licensed modules", "Cancel anytime; 30-day read-only grace"] },
        { name: "Max", tagline: "All five modules", bullets: ["Team roles and permissions across modules", "Priority support", "Advanced usage limits"] },
      ],
    },
    moat: [
      { title: "The entity-ownership map", body: "A prospect, a customer and a supplier are one party row with several roles. An estimate, an invoice and a purchase order are one documents table. This anti-duplication contract is the product." },
      { title: "Proven components, new chassis", body: "Discovery is ported from a working GTM product; Inventory and the GST engine from a working operations product. Service is built fresh against a well-documented reference category." },
      { title: "Cancel-safe by design", body: "Licensing never deletes data and reactivation replays parked events — the confidence a business needs to try a module." },
    ],
    traction: [
      { label: "Architecture decisions", value: "13 ADRs", note: "All signed off; enforced by CI import-boundary and migration lints" },
      { label: "Modules", value: "5 on one schema", note: "Discovery, Inventory, Service, CRM, Finance — independently licensable" },
      { label: "Enforcement", value: "4 layers", note: "RLS · route guard · server action · registry-driven UI" },
      { label: "Region", value: "ap-south-1 (Mumbai)", note: "Tenant isolation at the database layer; full audit trail" },
    ],
    roadmap: [
      { horizon: "Now", items: ["Finance module and GST filing flows", "Platform admin portal", "UI design refresh across the shell"] },
      { horizon: "Next", items: ["CRM channel connectors (WhatsApp, email)", "Team roles and permissions across modules", "Per-module pricing and billing"] },
      { horizon: "Later", items: ["Public API and partner integrations", "Additional compliance regimes beyond GST", "Independent deployability per module as scale demands"] },
    ],
    ask: "Seeking design customers in field service and distribution, and investors who understand vertical SaaS in India's GST-native SMB market.",
    facts: [
      { label: "Platform", value: "Web · responsive · mobile-friendly field work" },
      { label: "AI", value: "OpenAI, Anthropic, Google — BYOK or platform key" },
      { label: "Data", value: "Supabase PostgreSQL, schema-per-module, RLS tenant AND licensed" },
      { label: "Pricing", value: "Free · Pro (per module) · Max (bundle)" },
    ],
  },
  {
    slug: "wonderagent",
    name: "WonderAgent",
    tagline: "Govern every AI agent. Verify every action.",
    oneLiner:
      "Vendor-neutral AI identity governance and runtime assurance: every AI agent gets an owner, an approved purpose, a computed view of what it can reach — and a record of what it actually did.",
    category: "Enterprise · Security / Identity governance",
    audience: "CISOs, IAM and GRC teams running AI agents in production",
    geography: "Global enterprise",
    stage: "Live multi-tenant platform · P0 complete across 11 modules",
    url: "https://wonder-agent-tau.vercel.app/",
    helpUrl: "https://wonder-agent-tau.vercel.app/help",
    accent: "oklch(0.546 0.215 260)",
    accentSoft: "oklch(0.93 0.03 262)",
    logo: { light: "/brands/wonderagent/wonderagent-wordmark-light.webp", dark: "/brands/wonderagent/wonderagent-wordmark-dark.webp", mark: "/brands/wonderagent/wonderagent-mark.webp" },
    hero: {
      headline: "AI agents are identities. Govern them like it.",
      sub: "WonderAgent continuously compares what an agent SHOULD do, what it CAN do and what it DID — and raises an evidence-backed finding the moment they stop agreeing. Read-only to start. Your IAM stays the system of record.",
    },
    problem: {
      title: "The agent nobody owns, with access nobody approved.",
      lede: "Enterprises are deploying AI agents faster than any control can track them. Most exist as untracked service accounts.",
      points: [
        { title: "No owner", body: "Provisioned as SVC_FINANCEBOT_PRD by someone who has since changed teams. No business owner, no technical owner, nobody to approve a change." },
        { title: "Purpose that no control can read", body: "The agent's approved scope lives in a ticket, a design doc or someone's memory — never anywhere a control can evaluate." },
        { title: "Access far beyond purpose", body: "Nested groups, OAuth scopes and tool permissions add up to reach that nobody has computed, let alone certified." },
        { title: "Behaviour disconnected from identity", body: "Runtime logs sit in an observability tool keyed by service name, cut off from the entitlement and approval that allowed the action." },
      ],
    },
    solution: {
      title: "SHOULD. CAN. DID. Three views that must agree.",
      lede: "WonderAgent makes agents first-class enterprise identities across the IAM platforms a customer already runs — Saviynt, Okta, Entra, custom IAM and MCP runtimes map into one canonical model.",
      pillars: [
        { title: "Identity & lifecycle", body: "Every agent gets an owner, a purpose contract and a lifecycle state from discovered to retired. Discovery surfaces agent-like identities from connected systems; duplicates are detected and merged." },
        { title: "Effective access (CAN)", body: "Real technical reach computed from entitlements, roles, groups, OAuth scopes and tool permissions — with access paths, so the right grant is removed rather than guessed." },
        { title: "Runtime assurance (DID)", body: "MCP and REST event ingestion builds a per-agent timeline of tools invoked, resources touched and actions taken, correlated back to identity and compared against SHOULD and CAN." },
        { title: "Risk, certification & evidence", body: "Deterministic scoring — never an LLM guess — for excessive access, unauthorised actions, sensitive-data violations and behavioural deviation. Certification campaigns produce auditor-ready evidence packs." },
      ],
    },
    howItWorks: [
      { step: "Connect", body: "Import identities and access from existing IAM plus runtime events from MCP or REST sources. Connectors declare capabilities explicitly; read-only means read-only." },
      { step: "Declare purpose", body: "Name an owner, approved applications, approved data classes and approved actions. That contract becomes SHOULD." },
      { step: "Compare continuously", body: "Purpose, effective access and observed behaviour are evaluated by explicit rules. Findings carry the evidence that produced them." },
      { step: "Remediate with a human", body: "Every recommended revocation waits for a human to confirm, is recorded against the finding, and is re-evaluated once access changes." },
    ],
    screens: [
      { src: "/screenshots/wonderagent/overview-desktop-light.webp", alt: "WonderAgent overview dashboard for a tenant: agent counts, risk by severity, action queue and recent findings", kind: "desktop", caption: "Tenant overview — counts, risk by severity, action queue" },
      { src: "/screenshots/wonderagent/overview-mobile-light.webp", alt: "WonderAgent overview on a phone with metric cards stacked two across", kind: "mobile", caption: "The same overview on a phone" },
      { src: "/screenshots/wonderagent/risk-desktop-dark.webp", alt: "WonderAgent Risk screen listing agents with open findings, worst severity first", kind: "desktop", caption: "Risks & Alerts — worst severity first" },
      { src: "/screenshots/wonderagent/agents-desktop-light.webp", alt: "WonderAgent AI agents inventory with lifecycle state, criticality and owner", kind: "desktop", caption: "The agent inventory — owner, lifecycle, criticality" },
      { src: "/screenshots/wonderagent/home-mobile.webp", alt: "WonderAgent product site on a phone", kind: "mobile", caption: "Product site on mobile" },
      { src: "/screenshots/wonderagent/model-desktop.webp", alt: "WonderAgent SHOULD, CAN and DID model explained on the product site", kind: "desktop", caption: "SHOULD · CAN · DID — the governance model" },
      { src: "/screenshots/wonderagent/product-mobile.webp", alt: "WonderAgent product capabilities on a phone", kind: "mobile", caption: "Capabilities, on mobile" },
      { src: "/screenshots/wonderagent/agents-desktop-dark.webp", alt: "WonderAgent agent inventory in dark mode", kind: "desktop", caption: "Agent inventory, dark theme" },
    ],
    market: {
      title: "Non-human identity is the fastest-growing attack surface in the enterprise.",
      lede: "Every enterprise IAM programme was built for people. AI agents inherit service-account sprawl, then add autonomy. Security leaders need to answer 'which agents do we run, who owns them, what can they reach, what did they do?' — and prove it to auditors.",
      segments: ["Regulated enterprises in finance, healthcare and public sector", "Organisations rolling out MCP-based agent platforms", "IAM/IGA teams extending Saviynt, SailPoint, Okta or Entra to agents", "GRC teams facing AI-specific audit requirements"],
      whyNow: [
        "Agent adoption is outpacing governance; MCP has standardised how agents reach tools, which makes runtime observation tractable.",
        "Regulators and auditors are asking for demonstrable control over AI systems, not policy documents.",
        "Incumbent IAM vendors are strong on human identity; a vendor-neutral layer that keeps them as system of record is the low-friction path in.",
      ],
    },
    businessModel: {
      title: "Enterprise SaaS, priced per tenant.",
      lede: "Multi-tenant from day one with a separate vendor-only platform-admin boundary for tenants, subscriptions, feature flags, usage and health. Deployment-ready today; commercial packaging follows the first design customers.",
      plans: [
        { name: "Pilot", tagline: "Read-only proof", bullets: ["Connect one IAM and one runtime source", "Discover and register agents", "First risk findings and a certification round"] },
        { name: "Enterprise", tagline: "Governance in production", featured: true, bullets: ["Unlimited agents and integrations", "SSO/MFA, roles and permissions", "Certification campaigns and evidence packs", "Human-confirmed remediation workflows"] },
      ],
    },
    moat: [
      { title: "Deterministic by architecture", body: "No authorisation, risk, policy or remediation decision depends on a language model. AI writes advisory summaries only. That is an auditable promise competitors chasing 'AI security' cannot easily make." },
      { title: "Vendor-neutral canonical model", body: "Saviynt, SailPoint, Entra, Okta, custom IAM and MCP map into one model without any becoming the internal architecture." },
      { title: "Built to enterprise bar from line one", body: "Tenant RLS on every table, server-side tenant context, immutable audit, encrypted credentials, CSP headers, rate-limited auth — verified by a dedicated QA module." },
    ],
    traction: [
      { label: "Stories complete", value: "139 / 165", note: "84% across 11 modules; P0 done in every module" },
      { label: "API surface", value: "89 routes", note: "84 guarded by requirePermission; the 5 exceptions documented by design" },
      { label: "Screens", value: "27 + 8", note: "Customer pages plus vendor platform-admin console" },
      { label: "Integrations", value: "Saviynt · REST · MCP · Webhooks", note: "Read-only by default; write capabilities must be declared" },
    ],
    roadmap: [
      { horizon: "Now", items: ["Live IdP handshake for SAML/OIDC SSO", "Email notification channel", "Rollout of design-system primitives across every screen"] },
      { horizon: "Next", items: ["Point-in-time effective-access comparisons", "Scheduled certification escalation and evidence delivery", "SailPoint and Entra native connectors"] },
      { horizon: "Later", items: ["Approved automation paths for low-risk remediation", "Cross-framework control mappings", "Partner and MSSP editions"] },
    ],
    ask: "Seeking two to three enterprise design partners with agents in production, and investors focused on security and identity infrastructure.",
    facts: [
      { label: "Platform", value: "Web · responsive · vendor platform-admin console" },
      { label: "AI", value: "Advisory summaries only — OpenAI / Gemini, platform or BYOK" },
      { label: "Data", value: "Supabase PostgreSQL, tenant_id + RLS on every table" },
      { label: "Pricing", value: "Pilot · Enterprise (packaging with design partners)" },
    ],
  },
];

export const startupBySlug = (slug: string) => startups.find((s) => s.slug === slug);
