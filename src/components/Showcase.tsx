"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, ExternalLink } from "lucide-react";
import type { Startup } from "@/content/types";
import { Device } from "./Device";
import { Parallax } from "./Parallax";
import { Reveal } from "./Reveal";

/**
 * One landing-page chapter per product: sticky narrative on one side, a
 * parallax composition of desktop + phone captures on the other. Alternates.
 */
export function Showcase({ s, index }: { s: Startup; index: number }) {
  const flip = index % 2 === 1;
  const desktop = s.screens.filter((x) => x.kind === "desktop");
  const mobile = s.screens.filter((x) => x.kind === "mobile");
  const theme = index % 2 === 0 ? "theme-light bg-bg-soft" : "theme-dark bg-bg";

  return (
    <section id={s.slug} className={`${theme} section relative overflow-hidden text-fg`} aria-labelledby={`${s.slug}-title`}>
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 size-[60vw] max-w-[820px] rounded-full opacity-30 blur-[120px]"
        style={{ background: s.accent, [flip ? "left" : "right"]: "-15%" } as React.CSSProperties}
      />
      <div className={`container grid items-center gap-14 lg:grid-cols-12 ${flip ? "lg:[&>*:first-child]:order-2" : ""}`}>
        <div className="lg:col-span-5 lg:sticky lg:top-28">
          <Reveal>
            <p className="eyebrow" style={{ color: s.accent }}>
              {String(index + 1).padStart(2, "0")} · {s.category}
            </p>
            <h2 id={`${s.slug}-title`} className="headline mt-4 text-[clamp(2.25rem,5.5vw,4rem)]">
              {s.name}
              <span className="mt-2 block text-[0.55em] font-medium tracking-tight text-fg-muted">{s.tagline}</span>
            </h2>
            <p className="lede mt-6 text-[clamp(1.0625rem,1.5vw,1.25rem)] text-fg-muted">{s.oneLiner}</p>
          </Reveal>
          <Reveal delay={0.1}>
            <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-6 text-sm">
              {s.traction.slice(0, 2).map((t) => (
                <div key={t.label}>
                  <dt className="text-fg-subtle">{t.label}</dt>
                  <dd className="mt-1 text-xl font-semibold tracking-tight tabular-nums" style={{ color: s.accent }}>
                    {t.value}
                  </dd>
                </div>
              ))}
              <div>
                <dt className="text-fg-subtle">Stage</dt>
                <dd className="mt-1 font-medium">{s.stage}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Market</dt>
                <dd className="mt-1 font-medium">{s.geography}</dd>
              </div>
            </dl>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-[15px] font-medium">
              <Link href={`/startups/${s.slug}`} className="inline-flex items-center gap-1.5 rounded-full bg-fg px-5 py-2.5 text-bg transition-opacity hover:opacity-85">
                Investor deep dive <ArrowRight className="size-4" />
              </Link>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:underline underline-offset-4" style={{ color: s.accent }}>
                Live product <ExternalLink className="size-4" />
              </a>
              <a href={s.helpUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-fg-muted hover:text-fg hover:underline underline-offset-4">
                <BookOpen className="size-4" /> Help centre
              </a>
            </div>
          </Reveal>
        </div>

        <div className="relative lg:col-span-7">
          <div className="relative mx-auto max-w-[760px] pb-14 pt-6">
            <Parallax speed={0.12} scale={[0.96, 1.02]}>
              <Device shot={desktop[0]} sizes="(min-width: 1024px) 700px, 92vw" />
            </Parallax>
            {mobile[0] ? (
              <Parallax speed={-0.35} className={`absolute bottom-0 w-[28%] max-w-[210px] ${flip ? "right-[-2%] sm:right-[-4%]" : "left-[-2%] sm:left-[-4%]"}`}>
                <Device shot={mobile[0]} sizes="210px" />
              </Parallax>
            ) : null}
            {desktop[1] ? (
              <Parallax speed={0.3} className={`absolute top-[46%] hidden w-[46%] md:block ${flip ? "left-[-6%]" : "right-[-6%]"}`}>
                <Device shot={desktop[1]} sizes="380px" />
              </Parallax>
            ) : null}
            {mobile[1] ? (
              <Parallax speed={0.5} className={`absolute -top-2 hidden w-[22%] max-w-[170px] lg:block ${flip ? "left-[4%]" : "right-[4%]"}`}>
                <Device shot={mobile[1]} sizes="170px" />
              </Parallax>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
