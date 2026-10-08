import type { DeckCopy } from "./types";

/**
 * Short-form copy for each startup's pitch deck. A slide holds a line, not a
 * paragraph, so these are hand-written rather than trimmed from the page copy.
 * Anything with a number (market figures, traction, plans, roadmap) is NOT here:
 * the deck builder reads those straight from startups.ts so the deck and the
 * page can never disagree.
 */
export const deckCopy: Record<string, DeckCopy> = {
  wonderhome: {
    problem: [
      "Family admin never ends, and it lands on one person.",
      "Every tool adds another list to feed; none notices what is slipping.",
      "A bill is noticed when it is overdue. Dinner is a question at 7 pm.",
      "Families won't hand a home to software that acts without asking.",
    ],
    solution: [
      { title: "Outcomes, not chores", body: "Plans backwards from ‘dinner by 8’ or ‘bill paid in time’." },
      { title: "Asks before it acts", body: "Every consequential step shows a plan: Confirm, Change or Cancel." },
      { title: "Reads the paperwork", body: "Send a school circular; each date, fee and item becomes a tracked entry." },
      { title: "The whole household", body: "School, meals, bills, health, help and pets in one place, by text or voice, in eight languages." },
    ],
    how: [
      { step: "Observe", body: "Calendars, school notices and the family's own words." },
      { step: "Understand & plan", body: "Outcomes are checked against time, people and stock." },
      { step: "Act with consent", body: "Routine work resolves quietly; anything big returns as a plan." },
      { step: "Monitor & learn", body: "Sparse, threaded notifications shaped by household preferences." },
    ],
    moat: [
      { title: "Consent architecture", body: "Deterministic policy sits outside the model, set per household and per responsibility." },
      { title: "A private household graph", body: "People, guardianship, stock, obligations and preferences compound into a model of one home." },
      { title: "Governed voice", body: "One conversation contract across channels; payments, orders and health changes never ride on voice alone." },
    ],
  },

  wonderjobs: {
    problem: [
      "The same job sits on six boards; the same résumé is rewritten ten times.",
      "Boards rank by recency or by who paid, never by fit.",
      "Auto-apply tools submit for you and damage your standing with employers.",
      "Stale and duplicate listings waste a seeker's scarcest resource: attention.",
    ],
    solution: [
      { title: "Say what you want", body: "One plain-language search across real employer boards and feeds." },
      { title: "See why", body: "Every match explains itself, and so does every job it hides." },
      { title: "Apply in minutes", body: "A tailored résumé in eight templates; the employer's form filled in your own browser." },
      { title: "Stay in control", body: "It never submits. The final click is always the candidate's." },
    ],
    how: [
      { step: "Find", body: "Describe the role in your own words." },
      { step: "Decide", body: "Compare matches with the reasons behind each." },
      { step: "Apply", body: "An Application Pack of real, labelled materials." },
      { step: "Progress", body: "A pipeline built from real applications." },
    ],
    moat: [
      { title: "Honesty as a feature", body: "Only sources actually searched are shown, and nothing is ever submitted on a candidate's behalf." },
      { title: "A job-data layer", body: "Opportunities de-duplicated across sources with per-field provenance and source-health monitoring." },
      { title: "Deterministic core", body: "Matching and quality checks are rule-based and tested; the AI only drafts prose." },
    ],
  },

  wondercreator: {
    problem: [
      "Raw material is scattered across a dozen apps, so connections go unseen.",
      "AI drafts carry no record of the sources, versions or rights behind them.",
      "Who owns what is tracked in memory, if at all.",
      "Feeds rank by vanity; makers want honest, specific feedback.",
    ],
    solution: [
      { title: "Capture anything", body: "Text, photos, voice, PDFs and links in one library with provenance." },
      { title: "AI that suggests", body: "CreativeMind connects your material and offers directions; you decide." },
      { title: "A studio that remembers", body: "Immutable versions, compare and restore, and a lineage of what came from what." },
      { title: "Publish and gather", body: "A Creator Page, collaboration with attribution, and feedback with no likes or ranking." },
    ],
    how: [
      { step: "Capture", body: "A note, a memo, a photo or a link, in a moment." },
      { step: "Connect", body: "CreativeMind notices how the pieces relate." },
      { step: "Create", body: "Shape writing, carousels, images, video, audio or slides." },
      { step: "Share", body: "Publish to a Creator Page or ask for feedback." },
    ],
    moat: [
      { title: "Provenance by default", body: "Source, version and rights recorded from the first note, which is hard to retrofit." },
      { title: "Governed AI, not autopilot", body: "Hard ceilings for rights, commerce and deletion; honest 'not connected' states." },
      { title: "Against vanity metrics", body: "A deliberate position: no likes, no trending, no ranking." },
    ],
  },

  wonderark: {
    problem: [
      "Growth turns into a pile of tools: five logins, five customer records.",
      "Stock counts disagree with what a field crew actually used.",
      "GST returns are re-keyed from sales data that already exists elsewhere.",
      "Every integration is an export, an import and a person with a spreadsheet.",
    ],
    solution: [
      { title: "Discovery, Marketing & Funding", body: "AI finds and scores customers, plans campaigns and runs the investor pipeline." },
      { title: "Inventory & Service", body: "Stock, orders, jobs, crews and field work on one record of the truth." },
      { title: "CRM", body: "One inbox across WhatsApp and email, tied to the same customer record." },
      { title: "Finance & GST", body: "Automatic posting, statements with drill-down, and GST from real sales data." },
    ],
    how: [
      { step: "Create the business once", body: "One signup, one login, one business record." },
      { step: "License what you need", body: "Start with one module; add or drop later." },
      { step: "Data connects itself", body: "A won prospect becomes a customer; a job moves stock; an invoice feeds GST." },
      { step: "Add a module in place", body: "The next module already knows your customers and items." },
    ],
    moat: [
      { title: "One entity map", body: "A prospect, customer and supplier are one party record; an invoice and a purchase order share one documents table." },
      { title: "Books from the same records", body: "Statements and GST come from the same sales and stock records, so books and operations can't drift." },
      { title: "Cancel-safe by design", body: "Cancelling never deletes data: 30 days read-only, then retained for reactivation." },
    ],
  },

  wonderid: {
    problem: [
      "AI agents got production access. Nobody gave them an identity.",
      "No owner: provisioned by someone who has since changed teams.",
      "No readable purpose: scope lives in a ticket, not where a control can see it.",
      "No link between what an agent can reach and what it actually did.",
    ],
    solution: [
      { title: "AI agent governance", body: "Compare what an agent SHOULD do, CAN do and DID, with evidence for every gap." },
      { title: "One identity directory", body: "People, service accounts, applications and agents, reconciled from authoritative sources." },
      { title: "Applications, onboarded properly", body: "Discovery, validation, simulation and four-eyes approval before anything goes live." },
      { title: "Self-service access", body: "Request catalog, multi-stage approvals that forbid self-approval, access packages." },
    ],
    how: [
      { step: "Connect", body: "Import identities and access from existing IAM; read-only to start." },
      { step: "Declare purpose", body: "An owner and approved apps, data and actions become SHOULD." },
      { step: "Compare continuously", body: "Explicit rules, not model judgement, raise findings with evidence." },
      { step: "Remediate with a human", body: "Every revocation waits for a person and is re-checked." },
    ],
    moat: [
      { title: "Agent-first, identity-wide", body: "Incumbents bolt agents onto a human model; WonderID started from the agent and extends outward." },
      { title: "Deterministic by architecture", body: "No access or risk decision depends on a language model: an auditable promise." },
      { title: "Vendor-neutral model", body: "Saviynt, SailPoint, Entra, Okta and MCP map into one model without any becoming the architecture." },
    ],
  },
};
