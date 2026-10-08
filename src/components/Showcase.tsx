"use client";

import Link from "next/link";
import { ArrowRight, Presentation } from "lucide-react";
import type { Startup } from "@/content/types";
import { DevicePair } from "./DevicePair";
import { EmailCTA } from "./EmailCTA";
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
              <Link href={`/startups/${s.slug}#deck`} className="inline-flex items-center gap-1.5 text-fg-muted hover:text-fg hover:underline underline-offset-4">
                <Presentation className="size-4" /> Deck
              </Link>
              <EmailCTA name={s.name} tone="outline" />
            </div>
          </Reveal>
        </div>

        <div className="relative lg:col-span-7">
          <DevicePair desktop={desktop[0]} mobile={mobile[0]} flip={flip} sizes="(min-width: 1024px) 560px, 80vw" />
        </div>
      </div>
    </section>
  );
}
