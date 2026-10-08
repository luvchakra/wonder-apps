import Link from "next/link";
import { ArrowRight, Download, FileText, Presentation } from "lucide-react";
import { Hero } from "@/components/Hero";
import { Showcase } from "@/components/Showcase";
import { Reveal } from "@/components/Reveal";
import { Stat } from "@/components/Stats";
import { ContactForm } from "@/components/ContactForm";
import { SectionHeading } from "@/components/ui";
import { deckFile } from "@/content/decks";
import { startups } from "@/content/startups";
import { portfolioTotals } from "@/content/progress";

// Floored to the hundred so the copy can never overstate what the trackers show.
const shippedFloor = Math.floor(portfolioTotals().done / 100) * 100;
const citedFigures = startups.reduce((n, s) => n + s.market.figures.length, 0);

export default function Home() {
  return (
    <>
      <Hero />

      {/* Snapshot */}
      <section id="snapshot" className="theme-light section bg-bg text-fg" aria-labelledby="snapshot-title">
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow="Portfolio at a glance"
              title={<span id="snapshot-title">Five startups. Pick the market you believe in.</span>}
              lede="Each company is its own opportunity with its own customer, market and business model. Compare them here, then open the deep dive or the deck for the one that fits your thesis."
            />
          </Reveal>
          <div className="mt-14 overflow-hidden rounded-3xl border border-line">
            <ul className="divide-y divide-line">
              {startups.map((s, i) => (
                <Reveal as="li" key={s.slug} delay={(i % 3) * 0.05} className="grid gap-5 bg-bg p-6 sm:p-8 lg:grid-cols-12 lg:items-center">
                  <div className="lg:col-span-4">
                    <p className="eyebrow" style={{ color: s.accent }}>
                      {s.category}
                    </p>
                    <h3 className="title mt-2 text-2xl">{s.name}</h3>
                    <p className="mt-1 text-sm text-fg-muted">{s.tagline}</p>
                  </div>
                  <div className="lg:col-span-4">
                    <p className="display text-[clamp(1.75rem,3vw,2.5rem)] leading-none" style={{ color: s.accent }}>
                      {s.market.figures[0]?.figure}
                    </p>
                    <p className="mt-2 text-sm leading-snug text-fg-muted">{s.market.figures[0]?.label}</p>
                    <p className="mt-1.5 text-xs text-fg-subtle">
                      {s.market.figures[0]?.source.publisher}, {s.market.figures[0]?.source.year}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium lg:col-span-4 lg:justify-end">
                    <Link href={`/startups/${s.slug}`} className="inline-flex items-center gap-1.5 rounded-full bg-fg px-4 py-2 text-bg transition-opacity hover:opacity-85">
                      Deep dive <ArrowRight className="size-3.5" />
                    </Link>
                    <Link href={`/startups/${s.slug}#deck`} className="inline-flex items-center gap-1.5 hover:underline underline-offset-4" style={{ color: s.accent }}>
                      <Presentation className="size-4" /> View deck
                    </Link>
                    <a href={deckFile(s.slug)} download className="inline-flex items-center gap-1.5 text-fg-muted hover:text-fg hover:underline underline-offset-4">
                      <Download className="size-4" /> PDF
                    </a>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Reveal delay={0}>
              <Stat label="Startups" value={String(startups.length)} note="Each live and open to try today" />
            </Reveal>
            <Reveal delay={0.06}>
              <Stat label="Investor decks" value={String(startups.length)} note="View full screen or download as PDF" />
            </Reveal>
            <Reveal delay={0.12}>
              <Stat label="Cited market figures" value={String(citedFigures)} note="Every one links to its publisher" />
            </Reveal>
            <Reveal delay={0.18}>
              <Stat label="Public engineering trackers" value={String(startups.length)} note="Progress you can check, story by story" />
            </Reveal>
          </div>
        </div>
      </section>

      {/* Portfolio */}
      <div id="portfolio" className="scroll-mt-[var(--nav-h)]">
        <div className="theme-dark bg-bg text-fg">
          <div className="container pt-24 pb-4 text-center sm:pt-32">
            <Reveal>
              <SectionHeading eyebrow="The portfolio" title="Five startups. Each a complete company." lede="Scroll through each product, then open its deep dive for problem, market, model, moat, execution, roadmap and deck." align="center" />
            </Reveal>
          </div>
        </div>
        {startups.map((s, i) => (
          <Showcase key={s.slug} s={s} index={i} />
        ))}
      </div>

      {/* Founder */}
      <section id="founder" className="theme-light section bg-bg-soft text-fg" aria-labelledby="founder-title">
        <div className="container grid items-start gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <SectionHeading eyebrow="Who's building this" title={<span id="founder-title">Founder-led. Specified in writing, verified in public.</span>} />
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-7">
            <div className="card p-7 sm:p-10">
              <p className="lede text-lg text-fg-muted">
                WonderApps is built by a solo technical founder who designs each product as a complete specification — architecture decisions, security baseline, module backlogs with acceptance criteria — and then directs coordinated AI coding agents to implement it story by story, with typecheck, lint, tests and tenant-isolation proofs required before anything merges.
              </p>
              <p className="mt-5 leading-relaxed text-fg-muted">
                The result is unusual leverage: five production deployments and more than {shippedFloor.toLocaleString("en-US")} tracked stories shipped, with every decision and every deviation recorded in the repositories for anyone doing diligence to read. The founder&apos;s operating history and background are shared directly in conversation.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/contact" className="inline-flex h-11 items-center gap-2 rounded-full bg-fg px-5 font-medium text-bg transition-opacity hover:opacity-85">
                  Meet the founder <ArrowRight className="size-4" />
                </Link>
                <Link href="/appstracker" className="inline-flex h-11 items-center gap-2 rounded-full px-5 font-medium text-accent hover:underline underline-offset-4">
                  <FileText className="size-4" /> See the engineering trackers
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
            <SectionHeading eyebrow="Get in touch" title={<span id="contact-title">Interested in one? Or more than one?</span>} lede="Investors, strategic partners and design customers: tell us which product caught your eye. Decks are on each page; engineering trackers, code access and live walkthroughs are available on request." />
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
