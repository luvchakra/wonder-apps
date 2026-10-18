import { TimeChart } from "./charts";
import { Card, Empty, Sparkline } from "./parts";
import { formatValue } from "@/lib/dashboard/format";
import { PORTFOLIO_KEYS } from "@/lib/dashboard/portfolio";
import { historySeries, type StatHistory } from "@/lib/dashboard/store";
import type { AppDashboard, StatDef } from "@/lib/dashboard/types";

const shortDay = (d: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));

function building(h: StatHistory) {
  return h.days.length
    ? `History builds up from the first collection (${shortDay(h.days[0])}); ${h.days.length} day${h.days.length > 1 ? "s" : ""} recorded so far. Two or more are needed to draw a trend.`
    : "Nothing has been recorded yet. History starts with the first collection.";
}

/** Portfolio over time: people with an account and monthly active people, one line per product. */
export function PortfolioHistory({ h, apps }: { h: StatHistory; apps: { slug: string; name: string; color: string }[] }) {
  const ready = h.days.length >= 2;
  const lines = (pick: "users" | "mau") => apps.map((a) => ({ name: a.name, color: a.color, values: historySeries(h, a.slug, PORTFOLIO_KEYS[a.slug]?.[pick]) }));
  return (
    <section aria-label="Recorded history" className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card title="People with an account, day by day" hint="Recorded once a day from each product (and on Refresh). Days before the first collection are blank, never zero.">
        {ready ? <TimeChart days={h.days} series={lines("users")} format="int" kind="area" label="history-users" height={240} /> : <Empty>{building(h)}</Empty>}
      </Card>
      <Card title="Monthly active people, day by day" hint="People active in the 30 days to each recorded day, as each product defines active.">
        {ready ? <TimeChart days={h.days} series={lines("mau")} format="int" kind="area" label="history-mau" height={240} /> : <Empty>{building(h)}</Empty>}
      </Card>
    </section>
  );
}

/** One product's headline numbers over time, as small multiples (each on its own scale). */
export function AppHistory({ h, app, color }: { h: StatHistory; app: AppDashboard; color: string }) {
  const stats = app.metrics.filter((m): m is StatDef => m.kind === "stat" && !!m.headline);
  const ready = h.days.length >= 2;
  return (
    <Card
      title="Headline numbers over time"
      hint="One reading per recorded day: totals as they stood that day, and range numbers over the 7 days to that day. Each chart has its own scale."
    >
      {!ready ? (
        <Empty>{building(h)}</Empty>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((m) => {
            const vals = historySeries(h, app.slug, m.id);
            const known = vals.filter((v): v is number => v !== null);
            const last = known.at(-1) ?? null;
            const first = known[0] ?? null;
            return (
              <li key={m.id} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
                <p className="text-xs" style={{ color: "#8c8b84" }}>{m.label}{m.snapshot ? "" : " · 7 days to each day"}</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums" style={{ color: "#fff" }}>
                  {formatValue(last, m.format)}
                  {first !== null && last !== null && known.length > 1 ? (
                    <span className="ml-2 text-xs font-normal" style={{ color: "#8c8b84" }}>
                      from {formatValue(first, m.format)} on {shortDay(h.days[vals.indexOf(first)])}
                    </span>
                  ) : null}
                </p>
                <div className="mt-2">{known.length > 1 ? <Sparkline values={known} color={color} /> : <p className="text-xs" style={{ color: "#8c8b84" }}>Not enough readings yet.</p>}</div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
