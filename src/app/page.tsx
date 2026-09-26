import Link from "next/link";
import { ArrowRight, Cpu, Database, Fingerprint, GitBranch, ShieldCheck, Sparkles } from "lucide-react";
import { Hero } from "@/components/Hero";
import { Marquee } from "@/components/Marquee";
import { Showcase } from "@/components/Showcase";
import { Reveal } from "@/components/Reveal";
import { Stat } from "@/components/Stats";
import { ContactForm } from "@/components/ContactForm";
import { SectionHeading } from "@/components/ui";
import { startups } from "@/content/startups";
import { portfolioTotals } from "@/content/progress";
import { site } from "@/content/site";

const shipped = portfolioTotals();

const chassis = [
  { icon: Database, title: "One data layer", body: "Supabase PostgreSQL with row-level security on every tenant-scoped table. Tenant context is resolved server-side; a client-supplied identifier is never trusted." },
  { icon: ShieldCheck, title: "Deterministic guardrails", body: "Authorisation, entitlement, risk and policy decisions are rules, not model output. Language models draft, summarise and converse — they never decide." },
  { icon: Fingerprint, title: "Human in the loop", body: "Every consequential action — a payment, an application, an outreach, a revocation — waits for a person. Autonomy is a per-capability setting, audited." },
  { icon: Cpu, title: "Multi-provider AI", body: "Anthropic, OpenAI and Google behind one abstraction, with bring-your-own-key encrypted at rest. Provider risk and inference cost are both hedged." },
  { icon: GitBranch, title: "Modular by contract", body: "Modules communicate through published contracts and a Postgres-backed event table. Import boundaries and migration rules are enforced in CI, not by convention." },
  { icon: Sparkles, title: "AI-native development", body: "Each product is built from a written backlog by coordinated coding agents under a standing orchestration policy — one story at a time, verified before merge." },
];

const marquee = [
  "Next.js 16 · React 19 · TypeScript",
  "Supabase PostgreSQL · RLS on every table",
  "Anthropic · OpenAI · Google — BYOK",
  "Deterministic authorisation",
  "Immutable audit trails",
  "Installable PWAs",
  "Vercel · ap-south-1 data residency",
  "CI-enforced module boundaries",
  "WCAG 2.2 AA targets",
  "Human-confirmed consequential actions",
];

export default function Home() {
  return (
    <>
      <Hero />

      <div className="theme-dark border-y border-line bg-bg text-fg">
        <Marquee items={marquee} />
      </div>

      {/* Thesis */}
      <section id="thesis" className="theme-light section bg-bg text-fg" aria-labelledby="thesis-title">
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow="Investment thesis"
              title={<span id="thesis-title">Software is becoming agents. Someone has to run them — and govern them.</span>}
              lede="Every product in this portfolio is the same bet from a different angle: an AI system that observes, plans and acts on a person's or a company's behalf, wrapped in the controls that make it safe to trust. Three products sell the agent. The fourth sells the control plane."
            />
          </Reveal>
          <div className="mt-16 grid gap-4 md:grid-cols-2">
            {[
              { n: "01", t: "Agents, not chatbots", b: "WonderHome, WonderJobs and WonderArk each run background loops that hold an outcome and interrupt only when a decision is needed. The value is the work that gets done, not the conversation." },
              { n: "02", t: "Trust is the product", b: "Consent-first design, deterministic policy and audit trails are not compliance theatre. They are why a family lets software pay a bill, a candidate lets it draft an application, and an enterprise lets it near its IAM." },
              { n: "03", t: "One chassis, four wedges", b: "Shared architecture means each new product costs a fraction of the first. Consumer, prosumer, SMB and enterprise wedges de-risk one another without sharing a customer." },
              { n: "04", t: "Governance is the picks-and-shovels play", b: "As agent adoption compounds, so does the need to inventory, scope and certify every identity that holds access. WonderID starts with AI agents, extends to people and machines, and sits vendor-neutral above the IAM stack every enterprise already owns." },
            ].map((x, i) => (
              <Reveal key={x.n} delay={i * 0.07} className="card p-7 sm:p-9">
                <p className="eyebrow text-accent">{x.n}</p>
                <h3 className="title mt-3 text-2xl">{x.t}</h3>
                <p className="mt-3 leading-relaxed text-fg-muted">{x.b}</p>
              </Reveal>
            ))}
          </div>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Reveal delay={0}>
              <Stat label="Products live" value="4" note="All deployed, all free to try today" />
            </Reveal>
            <Reveal delay={0.06}>
              <Stat label="Tracked stories shipped" value={shipped.done.toLocaleString("en-US")} note={`Across all four products' public trackers, as of ${site.lastUpdated}`} />
            </Reveal>
            <Reveal delay={0.12}>
              <Stat label="Market wedges" value="4" note="Consumer · Prosumer · SMB · Enterprise" />
            </Reveal>
            <Reveal delay={0.18}>
              <Stat label="Season to build" value="1" note="Planned, built and deployed across September 2026" />
            </Reveal>
          </div>
        </div>
      </section>

      {/* Portfolio */}
      <div id="portfolio" className="scroll-mt-[var(--nav-h)]">
        <div className="theme-dark bg-bg text-fg">
          <div className="container pt-24 pb-4 text-center sm:pt-32">
            <Reveal>
              <SectionHeading eyebrow="The portfolio" title="Four products. Each a complete company." lede="Scroll through each product, then open its investor deep dive for problem, market, model, moat, execution and roadmap." align="center" />
            </Reveal>
          </div>
        </div>
        {startups.map((s, i) => (
          <Showcase key={s.slug} s={s} index={i} />
        ))}
      </div>

      {/* Chassis */}
      <section id="chassis" className="theme-dark section bg-bg text-fg" aria-labelledby="chassis-title">
        <div className="container">
          <Reveal>
            <SectionHeading eyebrow="The shared chassis" title={<span id="chassis-title">Why the fourth product cost less than the first.</span>} lede="Every Wonder product runs on the same architecture, written down as signed-off decisions and enforced by CI. Security is built at bootstrap, not bolted on — which is also why an enterprise security product and a family app can share a codebase philosophy without embarrassment." align="center" />
          </Reveal>
          <ul className="mt-16 grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {chassis.map((c, i) => (
              <Reveal as="li" key={c.title} delay={i * 0.05} className="bg-bg p-7 sm:p-8">
                <c.icon className="size-6 text-accent" />
                <h3 className="title mt-5 text-xl">{c.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">{c.body}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* Founder */}
      <section id="founder" className="theme-light section bg-bg-soft text-fg" aria-labelledby="founder-title">
        <div className="container grid items-start gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <SectionHeading eyebrow="Who's building this" title={<span id="founder-title">One founder-operator. A written-down way of working.</span>} />
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-7">
            <div className="card p-7 sm:p-10">
              <p className="lede text-lg text-fg-muted">
                WonderApps is built by a solo technical founder who designs each product as a complete specification — architecture decisions, security baseline, module backlogs with acceptance criteria — and then directs coordinated AI coding agents to implement it story by story, with typecheck, lint, tests and tenant-isolation proofs required before anything merges.
              </p>
              <p className="mt-5 leading-relaxed text-fg-muted">
                The result is unusual leverage: four production deployments, hundreds of tracked stories and a consistent security posture in a single season, with every decision and every deviation recorded in the repositories for anyone doing diligence to read. The founder&apos;s operating history and background are shared directly in conversation.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/contact" className="inline-flex h-11 items-center gap-2 rounded-full bg-fg px-5 font-medium text-bg transition-opacity hover:opacity-85">
                  Meet the founder <ArrowRight className="size-4" />
                </Link>
                <Link href="/#chassis" className="inline-flex h-11 items-center gap-2 rounded-full px-5 font-medium text-accent hover:underline underline-offset-4">
                  How the chassis works
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="theme-dark section bg-bg text-fg" aria-labelledby="contact-title">
        <div className="container grid gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <SectionHeading eyebrow="Get in touch" title={<span id="contact-title">Interested in one? Or all four?</span>} lede="Investors, strategic partners and design customers: tell us which product caught your eye. Decks, engineering trackers, code access and live walkthroughs are available on request." />
            <ul className="mt-10 grid gap-3">
              {startups.map((s) => (
                <li key={s.slug}>
                  <Link href={`/startups/${s.slug}`} className="group flex items-center justify-between rounded-2xl border border-line px-5 py-4 transition-colors hover:bg-fg/5">
                    <span className="flex items-center gap-3">
                      <span className="size-2.5 rounded-full" style={{ background: s.accent }} />
                      <span className="font-medium">{s.name}</span>
                      <span className="hidden text-sm text-fg-subtle sm:inline">{s.category}</span>
                    </span>
                    <ArrowRight className="size-4 text-fg-subtle transition-transform group-hover:translate-x-1" />
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-7">
            <ContactForm />
          </Reveal>
        </div>
      </section>
    </>
  );
}
