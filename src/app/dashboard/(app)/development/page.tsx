import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { TimeChart } from "@/components/dashboard/charts";
import { DevBar, DevFacts, DevStats, DevTabs, updatedLabel } from "@/components/dashboard/DevParts";
import { Card, Empty } from "@/components/dashboard/parts";
import { getProgressHistory } from "@/lib/content/load";
import { today } from "@/lib/progress/record";
import { dailySeries, pctOf } from "@/lib/progress/trends";
import { dashProducts } from "@/lib/dashboard/products";
import { appColor } from "@/lib/dashboard/colors";
import { loadDevSection } from "@/lib/dashboard/development";
import { requireSession } from "@/lib/dashboard/session";

export const dynamic = "force-dynamic";

export default async function DevelopmentPage() {
  await requireSession();
  const apps = (await dashProducts()).map((s) => ({ slug: s.slug, name: s.name, color: appColor(s.slug) }));
  const [sections, history] = await Promise.all([
    Promise.all(apps.map((a) => loadDevSection(a.slug))),
    getProgressHistory().catch((e: unknown) => {
      console.error("[development] progress history unavailable:", e instanceof Error ? e.message : e);
      return null;
    }),
  ]);
  const slugs = apps.map((a) => a.slug);
  const end = today();
  const pct = history ? dailySeries(history, slugs, pctOf, end) : null;
  const done = history ? dailySeries(history, slugs, (s) => s.done, end) : null;
  const seriesOf = (v: Record<string, (number | null)[]>) => apps.map((a) => ({ name: a.name, color: a.color, values: v[a.slug] ?? [] }));
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
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Completion over time" hint="Done stories against everything not set aside, rounded down. It can dip when a product adds scope.">
          {pct?.days.length ? <TimeChart days={pct.days} series={seriesOf(pct.values)} format="pct" kind="area" label="completion-over-time" height={260} /> : <Empty>No recorded history yet.</Empty>}
        </Card>
        <Card title="Stories done over time" hint="Recorded daily from each product's public tracker; earlier days rebuilt from the tracker's git history.">
          {done?.days.length ? <TimeChart days={done.days} series={seriesOf(done.values)} format="int" kind="area" label="stories-done-over-time" height={260} /> : <Empty>No recorded history yet.</Empty>}
        </Card>
      </div>
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
                  {s.totals ? s.totals.activeCompletionPct : "—"}
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
