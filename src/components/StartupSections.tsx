import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, ExternalLink, Lock } from "lucide-react";
import { site } from "@/content/site";
import type { Startup } from "@/content/types";
import { Device } from "./Device";
import { Parallax } from "./Parallax";
import { Reveal } from "./Reveal";
import { Stat } from "./Stats";
import { Eyebrow, SectionHeading } from "./ui";

/* --- Hero ---------------------------------------------------------------- */
export function StartupHero({ s }: { s: Startup }) {
  const desktop = s.screens.find((x) => x.kind === "desktop")!;
  const mobile = s.screens.find((x) => x.kind === "mobile");
  return (
    <section className="theme-dark relative overflow-hidden bg-bg text-fg">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="orb orb-a left-[-10%] top-[-20%] size-[55vw] max-w-[900px]" style={{ background: s.accent }} />
        <div className="orb orb-b right-[-15%] top-[20%] size-[40vw] max-w-[700px] opacity-30" style={{ background: s.accent }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_20%,#000_80%)]" />
      </div>
      <div className="container relative pt-[calc(var(--nav-h)+4rem)] pb-10 sm:pt-[calc(var(--nav-h)+6rem)]">
        <Reveal className="mx-auto max-w-4xl text-center">
          {s.logo ? (
            <Image src={s.logo.dark} alt={`${s.name} logo`} width={720} height={135} className="mx-auto h-9 w-auto sm:h-11" priority />
          ) : (
            <p className="eyebrow" style={{ color: s.accent }}>
              {s.name}
            </p>
          )}
          <p className="mt-6 text-sm font-medium text-fg-muted">
            {s.category} · {s.stage}
          </p>
          <h1 className="display balance mt-4 text-[clamp(2.5rem,7vw,5.5rem)]">{s.hero.headline}</h1>
          <p className="lede mx-auto mt-7 max-w-2xl text-[clamp(1.0625rem,1.6vw,1.375rem)] text-fg-muted">{s.hero.sub}</p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 font-medium text-black transition-transform hover:-translate-y-0.5">
              Open the live product <ExternalLink className="size-4" />
            </a>
            <a href={s.helpUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-full bg-white/10 px-6 font-medium text-white ring-1 ring-white/15 transition-colors hover:bg-white/15">
              <BookOpen className="size-4" /> User guide &amp; help centre
            </a>
            <Link href={`/contact?interest=${s.slug}`} className="inline-flex h-12 items-center gap-2 px-4 font-medium text-fg-muted hover:text-fg">
              Talk to the founder <ArrowRight className="size-4" />
            </Link>
          </div>
        </Reveal>
        <div className="relative mx-auto mt-16 max-w-5xl">
          <Parallax speed={0.08} scale={[1, 0.96]}>
            <div className="mx-auto w-[92%] sm:w-[82%]">
              <Device shot={desktop} priority sizes="(min-width: 1024px) 900px, 92vw" />
            </div>
          </Parallax>
          {mobile ? (
            <Parallax speed={-0.3} className="absolute bottom-[-6%] right-[-1%] w-[24%] max-w-[200px] sm:right-[2%]">
              <Device shot={mobile} priority sizes="200px" />
            </Parallax>
          ) : null}
        </div>
      </div>
      <div className="h-24 bg-gradient-to-b from-transparent to-bg" aria-hidden />
    </section>
  );
}

/* --- Facts strip --------------------------------------------------------- */
export function FactsStrip({ s }: { s: Startup }) {
  return (
    <section className="theme-dark bg-bg text-fg">
      <div className="container">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4">
          {s.facts.map((f) => (
            <div key={f.label} className="bg-bg p-5 sm:p-6">
              <dt className="eyebrow text-fg-subtle">{f.label}</dt>
              <dd className="mt-2 text-sm font-medium leading-relaxed">{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* --- Problem ------------------------------------------------------------- */
export function Problem({ s }: { s: Startup }) {
  return (
    <section className="theme-light section bg-bg text-fg" aria-labelledby="problem">
      <div className="container">
        <Reveal>
          <SectionHeading eyebrow="The problem" title={<span id="problem">{s.problem.title}</span>} lede={s.problem.lede} accent={s.accent} />
        </Reveal>
        <ul className="mt-14 grid gap-4 sm:grid-cols-2">
          {s.problem.points.map((p, i) => (
            <Reveal key={p.title} as="li" delay={i * 0.06} className="card p-6 sm:p-8">
              <span className="grid size-9 place-items-center rounded-full text-sm font-bold text-white" style={{ background: s.accent }}>
                {i + 1}
              </span>
              <h3 className="title mt-5 text-xl">{p.title}</h3>
              <p className="mt-2 leading-relaxed text-fg-muted">{p.body}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* --- Solution ------------------------------------------------------------ */
export function Solution({ s }: { s: Startup }) {
  return (
    <section className="theme-dark section bg-bg text-fg" aria-labelledby="solution">
      <div className="container">
        <Reveal>
          <SectionHeading eyebrow="The product" title={<span id="solution">{s.solution.title}</span>} lede={s.solution.lede} accent={s.accent} align="center" />
        </Reveal>
        <div className="mt-16 grid gap-px overflow-hidden rounded-3xl border border-line bg-line md:grid-cols-2">
          {s.solution.pillars.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.06} className="bg-bg p-7 sm:p-10">
              <Eyebrow style={{ color: s.accent }}>{String(i + 1).padStart(2, "0")}</Eyebrow>
              <h3 className="title mt-4 text-2xl">{p.title}</h3>
              <p className="mt-3 leading-relaxed text-fg-muted">{p.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --- How it works -------------------------------------------------------- */
export function HowItWorks({ s }: { s: Startup }) {
  return (
    <section className="theme-light section bg-bg-soft text-fg" aria-labelledby="how">
      <div className="container grid gap-12 lg:grid-cols-12">
        <Reveal className="lg:col-span-4 lg:sticky lg:top-28 lg:self-start">
          <SectionHeading eyebrow="How it works" title={<span id="how">From signal to outcome.</span>} accent={s.accent} />
        </Reveal>
        <ol className="lg:col-span-8 relative border-l border-line pl-8 sm:pl-12">
          {s.howItWorks.map((h, i) => (
            <Reveal key={h.step} as="li" delay={i * 0.05} className="relative pb-12 last:pb-0">
              <span className="absolute -left-[calc(2rem+7px)] top-1.5 grid size-3.5 place-items-center rounded-full ring-4 ring-bg-soft sm:-left-[calc(3rem+7px)]" style={{ background: s.accent }} />
              <p className="eyebrow text-fg-subtle">Step {i + 1}</p>
              <h3 className="title mt-2 text-2xl sm:text-3xl">{h.step}</h3>
              <p className="lede mt-3 max-w-2xl text-lg text-fg-muted">{h.body}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* --- Screens gallery ----------------------------------------------------- */
export function Gallery({ s }: { s: Startup }) {
  const shots = s.screens;
  return (
    <section className="theme-dark section overflow-hidden bg-bg text-fg" aria-labelledby="screens">
      <div className="container">
        <Reveal>
          <SectionHeading eyebrow="Product tour" title={<span id="screens">Desktop and mobile, one product.</span>} lede="Captured from the deployed product. Some views show demonstration data." accent={s.accent} align="center" />
        </Reveal>
      </div>
      <div className="container mt-16 grid grid-cols-6 gap-4 sm:gap-6 lg:gap-8">
        {shots.map((shot, i) => {
          const wide = shot.kind === "desktop";
          const span = wide ? "col-span-6 md:col-span-4" : "col-span-3 md:col-span-2";
          return (
            <Reveal key={shot.src} delay={(i % 3) * 0.06} className={`${span} flex flex-col items-center justify-end`}>
              <Parallax speed={wide ? 0.06 : -0.14 - (i % 2) * 0.08} className={wide ? "w-full" : "w-[78%] sm:w-[68%]"}>
                <Device shot={shot} sizes={wide ? "(min-width: 768px) 60vw, 100vw" : "(min-width: 768px) 20vw, 40vw"} />
              </Parallax>
              {shot.caption ? <p className="mt-4 text-center text-sm text-fg-subtle">{shot.caption}</p> : null}
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

/* --- Market -------------------------------------------------------------- */
export function Market({ s }: { s: Startup }) {
  return (
    <section className="theme-light section bg-bg text-fg" aria-labelledby="market">
      <div className="container grid gap-12 lg:grid-cols-2">
        <Reveal>
          <SectionHeading eyebrow="Market & why now" title={<span id="market">{s.market.title}</span>} lede={s.market.lede} accent={s.accent} />
          <h3 className="mt-10 text-sm font-semibold text-fg-subtle">Who buys</h3>
          <ul className="mt-3 grid gap-2">
            {s.market.segments.map((seg) => (
              <li key={seg} className="flex items-start gap-3 text-[15px]">
                <Check className="mt-0.5 size-4 shrink-0" style={{ color: s.accent }} />
                {seg}
              </li>
            ))}
          </ul>
        </Reveal>
        <div className="grid gap-4 self-center">
          {s.market.whyNow.map((w, i) => (
            <Reveal key={w} delay={0.1 + i * 0.08} className="card p-6 sm:p-7">
              <p className="eyebrow" style={{ color: s.accent }}>
                Why now · {i + 1}
              </p>
              <p className="mt-3 text-lg leading-snug font-medium tracking-tight">{w}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --- Business model ------------------------------------------------------ */
export function BusinessModel({ s }: { s: Startup }) {
  return (
    <section className="theme-dark section bg-bg text-fg" aria-labelledby="model">
      <div className="container">
        <Reveal>
          <SectionHeading eyebrow="Business model" title={<span id="model">{s.businessModel.title}</span>} lede={s.businessModel.lede} accent={s.accent} align="center" />
        </Reveal>
        <div className={`mx-auto mt-14 grid gap-4 ${s.businessModel.plans.length === 2 ? "max-w-3xl sm:grid-cols-2" : "sm:grid-cols-3"}`}>
          {s.businessModel.plans.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.08} className={`card relative p-7 ${p.featured ? "ring-2" : ""}`}>
              {p.featured ? (
                <span className="absolute -top-3 left-6 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white" style={{ background: s.accent }}>
                  Core
                </span>
              ) : null}
              <div style={p.featured ? ({ "--tw-ring-color": s.accent } as React.CSSProperties) : undefined} className="absolute inset-0 rounded-[inherit] ring-inherit" aria-hidden />
              <h3 className="title text-2xl">{p.name}</h3>
              <p className="mt-1 text-sm font-medium" style={{ color: s.accent }}>
                {p.tagline}
              </p>
              <ul className="mt-6 space-y-2.5 text-[15px] text-fg-muted">
                {p.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5">
                    <Check className="mt-1 size-4 shrink-0" style={{ color: s.accent }} />
                    {b}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --- Moat + traction ----------------------------------------------------- */
export function MoatAndTraction({ s }: { s: Startup }) {
  return (
    <section className="theme-light section bg-bg-soft text-fg" aria-labelledby="moat">
      <div className="container">
        <Reveal>
          <SectionHeading eyebrow="Defensibility" title={<span id="moat">What compounds.</span>} accent={s.accent} />
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {s.moat.map((m, i) => (
            <Reveal key={m.title} delay={i * 0.07} className="rounded-3xl border border-line p-7">
              <Lock className="size-5" style={{ color: s.accent }} />
              <h3 className="title mt-4 text-xl">{m.title}</h3>
              <p className="mt-2 leading-relaxed text-fg-muted">{m.body}</p>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-24">
          <SectionHeading eyebrow="Execution to date" title="Verifiable, not aspirational." lede="Pulled from the product's own public engineering trackers. Source code, trackers and live demos are available to serious parties on request." accent={s.accent} />
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {s.traction.map((t, i) => (
            <Reveal key={t.label} delay={i * 0.06}>
              <Stat label={t.label} value={t.value} note={t.note} accent={s.accent} />
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.2} className="mt-6">
          <Link href={`/appstracker#${s.slug}`} className="inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline" style={{ color: s.accent }}>
            See every module and epic, live from the repo <ArrowRight className="size-3.5" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/* --- Roadmap + ask ------------------------------------------------------- */
export function RoadmapAndAsk({ s }: { s: Startup }) {
  return (
    <section className="theme-dark section bg-bg text-fg" aria-labelledby="roadmap">
      <div className="container">
        <Reveal>
          <SectionHeading eyebrow="Roadmap" title={<span id="roadmap">What comes next.</span>} accent={s.accent} />
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {s.roadmap.map((r, i) => (
            <Reveal key={r.horizon} delay={i * 0.07} className="rounded-3xl border border-line p-7">
              <p className="eyebrow" style={{ color: s.accent }}>
                {r.horizon}
              </p>
              <ul className="mt-4 space-y-3 text-[15px] text-fg-muted">
                {r.items.map((it) => (
                  <li key={it} className="flex items-start gap-2.5">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-fg-subtle" />
                    {it}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-24 overflow-hidden rounded-[var(--radius-lg)] p-8 text-white sm:p-14" delay={0.05}>
          <div className="relative" style={{ background: "transparent" }}>
            <div aria-hidden className="absolute -inset-8 -z-10 rounded-[inherit] opacity-90" style={{ background: `linear-gradient(135deg, ${s.accent}, oklch(0.25 0.05 260))` }} />
            <p className="eyebrow text-white/70">The ask</p>
            <h2 className="headline balance mt-4 max-w-3xl text-[clamp(1.75rem,4vw,3rem)]">{s.ask}</h2>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={`/contact?interest=${s.slug}`} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 font-medium text-black transition-transform hover:-translate-y-0.5">
                Start a conversation <ArrowRight className="size-4" />
              </Link>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white/15 px-6 font-medium text-white ring-1 ring-white/25 hover:bg-white/20">
                Try {s.name} <ExternalLink className="size-4" />
              </a>
              <a href={s.helpUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center gap-2 px-4 font-medium text-white/80 hover:text-white">
                <BookOpen className="size-4" /> Help centre
              </a>
            </div>
            <p className="mt-6 text-sm text-white/70">
              Or email {s.name} directly:{" "}
              <a href={`mailto:${site.contactEmail}`} className="font-medium text-white underline-offset-2 hover:underline">
                {site.contactEmail}
              </a>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
