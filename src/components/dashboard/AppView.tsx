import Link from "next/link";
import { AlertTriangle, ArrowUpRight, DatabaseZap, PlugZap } from "lucide-react";
import { appColor } from "@/lib/dashboard/colors";
import { result } from "@/lib/dashboard/load";
import { SECTION_TITLES, type AppDashboard, type AppSnapshot, type SectionId, type SeriesDef, type Window } from "@/lib/dashboard/types";
import { daysIn } from "@/lib/dashboard/window";
import { CohortGrid, TimeChart, type ChartSeries } from "./charts";
import { BreakdownBars, Card, Empty, FunnelBars, StatTile, StatusPill } from "./parts";

/** Fixed categorical order (dark-surface steps) for stacked series inside one app. */
const SLOTS = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#9085e9", "#008300", "#e66767"];
const OTHER = "#6b6a65";

export function toChart(def: SeriesDef, snap: AppSnapshot, w: Window, color: string): { days: string[]; series: ChartSeries[] } | null {
  const r = result(snap, def.id, "series");
  if (!r) return null;
  const days = daysIn(w);
  const idx = new Map(days.map((d, i) => [d, i]));
  const by = new Map<string, number[]>();
  for (const p of r.points) {
    const name = p.series ?? def.label;
    const arr = by.get(name) ?? Array(days.length).fill(0);
    const i = idx.get(p.day);
    if (i != null) arr[i] += p.value;
    by.set(name, arr);
  }
  if (by.size === 0) by.set(def.label, Array(days.length).fill(0));
  let entries = [...by.entries()].sort((a, b) => b[1].reduce((s, v) => s + v, 0) - a[1].reduce((s, v) => s + v, 0));
  if (entries.length > 7) {
    const rest = entries.slice(7);
    entries = [...entries.slice(0, 7), ["Other", days.map((_, i) => rest.reduce((s, [, v]) => s + v[i], 0))]];
  }
  const series = entries.map(([name, values], k) => ({ name, values, color: entries.length === 1 ? color : name === "Other" ? OTHER : SLOTS[k % SLOTS.length] }));
  return { days, series };
}

function Unavailable({ message }: { message: string }) {
  return (
    <p className="flex items-start gap-2 rounded-xl px-3 py-3 text-xs" style={{ background: "rgba(230,103,103,0.08)", color: "#f1a3a3" }}>
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> Couldn&apos;t read this metric: {message}
    </p>
  );
}

export function SetupPanel({ app, snap }: { app: AppDashboard; snap: AppSnapshot }) {
  const unreachable = snap.status === "unreachable";
  return (
    <div className="dash-card p-6 sm:p-8">
      <span className="grid size-11 place-items-center rounded-2xl" style={{ background: "rgba(255,255,255,0.07)" }}>
        {unreachable ? <DatabaseZap className="size-5" style={{ color: "#e66767" }} /> : <PlugZap className="size-5" style={{ color: "#c3c2b7" }} />}
      </span>
      <h2 className="mt-5 text-xl font-semibold">{unreachable ? "The database didn't answer" : "Connect this product"}</h2>
      {unreachable ? (
        <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: "#c3c2b7" }}>
          The connection was refused or timed out ({snap.note}). Check that <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">{app.envVar}</code> is the pooled, read-only URL and that the database is awake.
        </p>
      ) : (
        <>
          <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: "#c3c2b7" }}>
            WonderApps keeps no database of its own. It reads this product&apos;s numbers live through a read-only connection that you control.
          </p>
          <ol className="mt-6 grid max-w-xl gap-4 text-sm" style={{ color: "#c3c2b7" }}>
            <li className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold" style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}>1</span>
              <span>
                In the product&apos;s database run <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">docs/dashboard/{app.slug}-readonly.sql</code>. It creates a role that can only <em>count</em> rows, with no access to emails, names or content.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold" style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}>2</span>
              <span>
                In Vercel (WonderApps project → Settings → Environment Variables) add <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">{app.envVar}</code> with that role&apos;s pooled connection string, then redeploy.
              </span>
            </li>
          </ol>
        </>
      )}
    </div>
  );
}

const ORDER: SectionId[] = ["audience", "engagement", "product", "revenue", "ai", "health"];

export function AppView({ app, snap, w }: { app: AppDashboard; snap: AppSnapshot; w: Window }) {
  const color = appColor(app.slug);
  if (snap.status === "not_configured" || snap.status === "unreachable") return <SetupPanel app={app} snap={snap} />;

  const errors = Object.values(snap.results).filter((r) => r.kind === "error");
  const headline = app.metrics.filter((m) => m.kind === "stat" && m.headline);
  const heroSeries = app.metrics.find((m): m is SeriesDef => m.kind === "series" && m.section === "audience");

  return (
    <div className="grid gap-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {headline.map((m) => {
          if (m.kind !== "stat") return null;
          const r = result(snap, m.id, "stat");
          return r ? <StatTile key={m.id} label={m.label} value={r.value} prev={r.prev} format={m.format} good={m.good} hint={m.hint} snapshot={m.snapshot} color={color} big /> : <Unavailable key={m.id} message={`${m.label} is unavailable.`} />;
        })}
      </div>

      {heroSeries ? (
        (() => {
          const chart = toChart(heroSeries, snap, w, color);
          return chart ? (
            <Card title={heroSeries.label} hint={heroSeries.hint}>
              <TimeChart days={chart.days} series={chart.series} format={heroSeries.format} kind={heroSeries.style ?? "area"} stacked={heroSeries.stacked} label={`${app.slug}-${heroSeries.id}`} height={240} />
            </Card>
          ) : null;
        })()
      ) : null}

      {ORDER.map((sec) => {
        const defs = app.metrics.filter((m) => m.section === sec && !(m.kind === "stat" && m.headline) && m.id !== heroSeries?.id);
        if (!defs.length) return null;
        const stats = defs.filter((m) => m.kind === "stat");
        const rest = defs.filter((m) => m.kind !== "stat");
        return (
          <section key={sec} aria-labelledby={`sec-${sec}`} className="grid gap-4">
            <div className="mt-2">
              <h2 id={`sec-${sec}`} className="text-xl font-semibold tracking-tight">{SECTION_TITLES[sec].title}</h2>
              <p className="mt-1 text-sm" style={{ color: "#8c8b84" }}>{SECTION_TITLES[sec].blurb}</p>
            </div>
            {stats.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {stats.map((m) => {
                  if (m.kind !== "stat") return null;
                  const r = result(snap, m.id, "stat");
                  return r ? <StatTile key={m.id} label={m.label} value={r.value} prev={r.prev} format={m.format} good={m.good} hint={m.hint} snapshot={m.snapshot} color={color} /> : null;
                })}
              </div>
            ) : null}
            <div className="grid gap-4 lg:grid-cols-2">
              {rest.map((m) => {
                const r = snap.results[m.id];
                if (!r) return null;
                const wide = m.kind === "cohort" || (m.kind === "series" && (m.stacked || false));
                const body =
                  r.kind === "error" ? (
                    <Unavailable message={r.message} />
                  ) : m.kind === "series" ? (
                    (() => {
                      const c = toChart(m, snap, w, color);
                      return c ? <TimeChart days={c.days} series={c.series} format={m.format} kind={m.style ?? "bars"} stacked={m.stacked} label={`${app.slug}-${m.id}`} height={200} /> : <Empty />;
                    })()
                  ) : m.kind === "breakdown" && r.kind === "breakdown" ? (
                    <BreakdownBars items={r.items} color={color} format={m.format} />
                  ) : m.kind === "funnel" && r.kind === "funnel" ? (
                    <FunnelBars steps={r.steps} color={color} />
                  ) : m.kind === "cohort" && r.kind === "cohort" ? (
                    r.cohorts.length ? <CohortGrid cohorts={r.cohorts} color={color} label={m.label} /> : <Empty />
                  ) : null;
                return (
                  <Card key={m.id} title={m.label} hint={m.hint} className={wide ? "lg:col-span-2" : ""}>
                    {body}
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}

      {errors.length ? (
        <details className="dash-card p-5 text-sm" style={{ color: "#c3c2b7" }}>
          <summary className="cursor-pointer font-medium">{errors.length} metric{errors.length > 1 ? "s" : ""} couldn&apos;t be read</summary>
          <ul className="mt-3 grid gap-2 text-xs">
            {errors.map((e) => (
              <li key={e.id}>
                <code className="rounded bg-white/10 px-1.5 py-0.5">{e.id}</code> {e.kind === "error" ? e.message : ""}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs" style={{ color: "#8c8b84" }}>Most often the database role hasn&apos;t been granted that table yet, or a migration hasn&apos;t run. Re-run <code>docs/dashboard/{app.slug}-readonly.sql</code>.</p>
        </details>
      ) : null}
    </div>
  );
}

export function AppHeader({ app, name, snap, tagline }: { app: AppDashboard; name: string; snap: AppSnapshot; tagline: string }) {
  const color = appColor(app.slug);
  return (
    <header className="dash-rise">
      <div className="flex flex-wrap items-center gap-3">
        <span className="size-3 rounded-full" style={{ background: color }} aria-hidden />
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{name}</h1>
        <StatusPill status={snap.status} />
      </div>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed" style={{ color: "#c3c2b7" }}>{tagline}</p>
      <p className="mt-3 max-w-2xl text-xs leading-relaxed" style={{ color: "#8c8b84" }}>
        <strong style={{ color: "#c3c2b7" }}>Watch first:</strong> {app.focus} <span className="mx-1">·</span> <strong style={{ color: "#c3c2b7" }}>How &ldquo;active&rdquo; is counted:</strong> {app.activeDefinition}
      </p>
      <Link href={`/startups/${app.slug}`} className="mt-3 inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline" style={{ color: "#8c8b84" }}>
        Public page <ArrowUpRight className="size-3" />
      </Link>
    </header>
  );
}
