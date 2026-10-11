import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DevBar, DevFacts, DevStats, DevTabs, updatedLabel } from "@/components/dashboard/DevParts";
import { startups } from "@/content/startups";
import { appColor } from "@/lib/dashboard/colors";
import { loadDevSection } from "@/lib/dashboard/development";
import { requireSession } from "@/lib/dashboard/session";

export const dynamic = "force-dynamic";

export default async function DevelopmentPage() {
  await requireSession();
  const apps = startups.map((s) => ({ slug: s.slug, name: s.name, color: appColor(s.slug) }));
  const sections = await Promise.all(apps.map((a) => loadDevSection(a.slug)));
  return (
    <div className="grid grid-cols-1 gap-8">
      <header className="dash-rise">
        <p className="dash-eyebrow">Development</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Where each app is being built.</h1>
        <p className="mt-2 max-w-2xl text-[15px]" style={{ color: "var(--d-ink-2)" }}>
          Read live from each product&rsquo;s own progress files, refreshed every few minutes. Open an app for its full progress: phases, decisions, what is left, story by story.
        </p>
      </header>
      <DevTabs apps={apps} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {apps.map((a, i) => {
          const s = sections[i];
          if (!s) return null;
          return (
            <Link key={a.slug} href={`/dashboard/development/${a.slug}`} className="dash-card group flex flex-col gap-4 p-5 transition-colors hover:border-white/20 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-[15px] font-semibold" style={{ color: "#fff" }}>
                    <span className="size-2.5 rounded-full" style={{ background: a.color }} aria-hidden />
                    {a.name}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "#8c8b84" }}>
                    {updatedLabel(s)}
                    {s.live ? "" : " · snapshot (live file unavailable)"}
                  </p>
                </div>
                <p className="text-3xl font-semibold tabular-nums" style={{ color: "#fff" }}>
                  {s.totals.activeCompletionPct}
                  <span className="text-lg" style={{ color: "#8c8b84" }}>%</span>
                </p>
              </div>
              <DevBar s={s} color={a.color} />
              <DevStats s={s} />
              <DevFacts s={s} limit={2} />
              <span className="mt-auto inline-flex items-center gap-1.5 text-sm" style={{ color: "#c3c2b7" }}>
                Open {a.name} development <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
