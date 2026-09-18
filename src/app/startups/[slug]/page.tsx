import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { startupBySlug, startups } from "@/content/startups";
import { BusinessModel, FactsStrip, Gallery, HowItWorks, Market, MoatAndTraction, Problem, RoadmapAndAsk, Solution, StartupHero } from "@/components/StartupSections";

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return startups.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const s = startupBySlug(slug);
  if (!s) return {};
  return {
    title: `${s.name} — ${s.tagline}`,
    description: s.oneLiner,
    openGraph: { title: `${s.name} · WonderApps`, description: s.oneLiner, images: [{ url: s.screens[0].src }] },
  };
}

export default async function StartupPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const s = startupBySlug(slug);
  if (!s) notFound();
  const idx = startups.findIndex((x) => x.slug === s.slug);
  const prev = startups[(idx + startups.length - 1) % startups.length];
  const next = startups[(idx + 1) % startups.length];

  return (
    <article style={{ "--accent": s.accent, "--accent-soft": s.accentSoft } as React.CSSProperties}>
      <StartupHero s={s} />
      <FactsStrip s={s} />
      <Problem s={s} />
      <Solution s={s} />
      <HowItWorks s={s} />
      <Gallery s={s} />
      <Market s={s} />
      <BusinessModel s={s} />
      <MoatAndTraction s={s} />
      <RoadmapAndAsk s={s} />

      <nav className="theme-dark border-t border-line bg-bg text-fg" aria-label="Other products">
        <div className="container grid divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <Link href={`/startups/${prev.slug}`} className="group flex items-center gap-4 py-8 sm:pr-8">
            <ArrowLeft className="size-5 text-fg-subtle transition-transform group-hover:-translate-x-1" />
            <span>
              <span className="block text-xs text-fg-subtle">Previous</span>
              <span className="block text-xl font-semibold tracking-tight">{prev.name}</span>
            </span>
          </Link>
          <Link href={`/startups/${next.slug}`} className="group flex items-center justify-end gap-4 py-8 text-right sm:pl-8">
            <span>
              <span className="block text-xs text-fg-subtle">Next</span>
              <span className="block text-xl font-semibold tracking-tight">{next.name}</span>
            </span>
            <ArrowRight className="size-5 text-fg-subtle transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </nav>
    </article>
  );
}
