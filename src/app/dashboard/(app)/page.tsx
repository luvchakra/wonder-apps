import Link from "next/link";
import { AlertOctagon, AlertTriangle, ArrowUpRight, CheckCircle2, Info } from "lucide-react";
import { TimeChart } from "@/components/dashboard/charts";
import { Card, DeltaChip, Empty, StatTile, StatusPill } from "@/components/dashboard/parts";
import { RangeTabs } from "@/components/dashboard/RangeTabs";
import { startups } from "@/content/startups";
import { appColor } from "@/lib/dashboard/colors";
import { delta, formatValue } from "@/lib/dashboard/format";
import { loadAll, parseRange, result } from "@/lib/dashboard/load";
import { attention, headlineStats, rollup } from "@/lib/dashboard/portfolio";
import { requireSession } from "@/lib/dashboard/session";
import { apps } from "@/lib/dashboard/registry";
import { RANGES } from "@/lib/dashboard/types";
import { windowLabel } from "@/lib/dashboard/window";

export const dynamic = "force-dynamic";

const nameOf = (slug: string) => startups.find((s) => s.slug === slug)?.name ?? slug;

const greeting = (tz: string) => {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  return h < 5 ? "Burning the midnight oil" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

export default async function Overview({ searchParams }: { searchParams: Promise<{ range?: string; fresh?: string }> }) {
  await requireSession();
  const sp = await searchParams;
  const { key, window: w } = parseRange(sp.range);
  const snaps = await loadAll(w, sp.fresh === "1");
  const roll = rollup(snaps, w);
  const todo = attention(snaps);
  const stamp = `${windowLabel(w)} · ${w.tz.replace("_", " ")}`;
  const unplugged = apps.filter((a) => snaps[a.slug]?.status === "not_configured");

  return (
    <div className="grid grid-cols-1 gap-8">
      <header className="dash-rise flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="dash-eyebrow">Portfolio pulse · {RANGES[key].label.toLowerCase()}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{greeting(w.tz)}.</h1>
          <p className="mt-2 max-w-xl text-[15px]" style={{ color: "var(--d-ink-2)" }}>
            {roll.live} of {roll.total} products are reporting. Everything here is read live from each product&apos;s own database, counts only.
          </p>
        </div>
        <RangeTabs base="/dashboard" current={key} stamp={stamp} />
      </header>

      {unplugged.length ? (
        <div className="flex items-start gap-3 rounded-2xl px-4 py-3 text-sm" style={{ background: "rgba(250,178,25,0.09)", color: "#e9cf8a" }}>
          <Info className="mt-0.5 size-4 shrink-0" />
          <p>
            {unplugged.map((a) => nameOf(a.slug)).join(", ")} {unplugged.length > 1 ? "aren't" : "isn't"} connected yet. Open {unplugged.length > 1 ? "each product" : "its page"} for the two setup steps.
          </p>
        </div>
      ) : null}

      <section aria-label="Portfolio totals" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile label="Users" value={roll.users} format="int" snapshot color="#fff" big hint="People with an account today, summed across products (for WonderArk and WonderID, the people inside customer businesses)." />
        <StatTile label="New signups" value={roll.newUsers} prev={roll.prevNewUsers} format="int" color="#fff" big hint="Signups in the window, summed. A signup is a person for the consumer products and a business or tenant for WonderArk and WonderID." />
        <StatTile label="Monthly active users" value={roll.mau} format="int" snapshot color="#fff" big hint="Users active in the last 30 days, summed across products (each product defines 'active' itself)." />
        <StatTile label="Paying customers" value={roll.paying} format="int" snapshot color="#fff" big hint="Accounts on a paid plan today, for the products that report one (WonderJobs and Wonder Creator are free today)." />
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card title="New signups per day, by product" hint="Each product keeps its colour everywhere on this dashboard.">
          {roll.signups.series.length ? (
            <TimeChart
              days={roll.signups.days}
              series={roll.signups.series.map((s) => ({ name: nameOf(s.slug), color: s.color, values: s.values }))}
              format="int"
              kind="bars"
              stacked
              label="portfolio-signups"
              height={300}
            />
          ) : (
            <Empty>Connect a product to see signups here.</Empty>
          )}
        </Card>

        <Card title="Needs you" hint="Dead connections, failing numbers and anything where lower is better and isn't zero.">
          {todo.length === 0 ? (
            <p className="flex items-center gap-2.5 rounded-xl px-3 py-4 text-sm" style={{ background: "rgba(12,163,12,0.08)", color: "#bfe8bf" }}>
              <CheckCircle2 className="size-4 shrink-0" style={{ color: "#0ca30c" }} /> Nothing needs you right now.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-2">
              {todo.slice(0, 6).map((t, i) => {
                const Icon = t.level === "critical" ? AlertOctagon : t.level === "warn" ? AlertTriangle : Info;
                const c = t.level === "critical" ? "#e66767" : t.level === "warn" ? "#fab219" : "#8c8b84";
                return (
                  <li key={i}>
                    <Link href={`/dashboard/${t.slug}?range=${key}`} className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5">
                      <Icon className="mt-0.5 size-4 shrink-0" style={{ color: c }} aria-hidden />
                      <span className="min-w-0 text-sm">
                        <span className="flex items-center gap-2">
                          <span className="size-2 rounded-full" style={{ background: appColor(t.slug) }} aria-hidden />
                          <span style={{ color: "#8c8b84" }}>{nameOf(t.slug)}</span>
                        </span>
                        <span className="block" style={{ color: "#fff" }}>
                          {t.title}
                          {t.detail ? <span style={{ color: "#c3c2b7" }}>: {t.detail}</span> : null}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <section aria-label="Products" className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {apps.map((a) => {
          const s = snaps[a.slug];
          const color = appColor(a.slug);
          const stats = headlineStats(a).slice(0, 4);
          return (
            <Link key={a.slug} href={`/dashboard/${a.slug}?range=${key}`} className="dash-card group block p-5 transition-colors hover:bg-[#1f1f1e]" style={{ borderTop: `3px solid ${color}` }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{nameOf(a.slug)}</h2>
                  <p className="mt-0.5 max-w-xs text-xs leading-relaxed" style={{ color: "#8c8b84" }}>{a.focus}</p>
                </div>
                <ArrowUpRight className="size-4 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" style={{ color: "#8c8b84" }} />
              </div>
              <div className="mt-2"><StatusPill status={s?.status ?? "not_configured"} /></div>
              {s && (s.status === "ok" || s.status === "partial") ? (
                <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
                  {stats.map((m) => {
                    if (m.kind !== "stat") return null;
                    const r = result(s, m.id, "stat");
                    const d = m.snapshot ? null : delta(r?.value ?? null, r?.prev);
                    return (
                      <div key={m.id}>
                        <dt className="truncate text-xs" style={{ color: "#8c8b84" }}>{m.label}</dt>
                        <dd className="mt-1 text-2xl font-semibold tabular-nums">{formatValue(r?.value, m.format)}</dd>
                        <div className="mt-1 min-h-4"><DeltaChip d={d} good={m.good} suffix="" /></div>
                      </div>
                    );
                  })}
                </dl>
              ) : (
                <p className="mt-5 text-sm" style={{ color: "#8c8b84" }}>{s?.note ?? "Waiting for a connection."}</p>
              )}
            </Link>
          );
        })}
      </section>
    </div>
  );
}
