import { appColor } from "./colors";
import { result } from "./load";
import { apps } from "./registry";
import type { AppDashboard, AppSnapshot, Window } from "./types";
import { daysIn } from "./window";

/**
 * Which of each product's metrics feed the cross-portfolio roll-up. Every product counts
 * "users" in its own way (WonderArk counts people inside businesses, WonderID people inside
 * tenants), so the roll-up says "people", and the per-product pages keep their own units.
 */
export type PortfolioKeys = {
  /** Snapshot stat: people with an account today. */
  users?: string;
  /** Stat: new people in the window. */
  newUsers?: string;
  /** Snapshot stat: people active in the last 30 days. */
  mau?: string;
  /** Snapshot stat: paying customers (accounts on a paid plan). */
  paying?: string;
  /** Daily series of new people. */
  signups?: string;
};

export const PORTFOLIO_KEYS: Record<string, PortfolioKeys> = {};

const stat = (snap: AppSnapshot | undefined, id?: string) => (id ? result(snap, id, "stat") : null);

export type Rollup = {
  users: number | null;
  newUsers: number | null;
  prevNewUsers: number | null;
  mau: number | null;
  paying: number | null;
  /** Daily new people stacked by product, aligned to the window's days. */
  signups: { days: string[]; series: { name: string; slug: string; color: string; values: number[] }[] };
  live: number;
  total: number;
};

export function rollup(snaps: Record<string, AppSnapshot>, w: Window): Rollup {
  const sum = (pick: (k: PortfolioKeys) => string | undefined, field: "value" | "prev" = "value") => {
    let got = false;
    let t = 0;
    for (const a of apps) {
      const r = stat(snaps[a.slug], pick(PORTFOLIO_KEYS[a.slug] ?? {}));
      const v = r?.[field];
      if (v != null) {
        got = true;
        t += v;
      }
    }
    return got ? t : null;
  };
  const days = daysIn(w);
  const idx = new Map(days.map((d, i) => [d, i]));
  const series = apps.flatMap((a) => {
    const id = PORTFOLIO_KEYS[a.slug]?.signups;
    const r = id ? result(snaps[a.slug], id, "series") : null;
    if (!r) return [];
    const values = Array(days.length).fill(0) as number[];
    for (const p of r.points) {
      const i = idx.get(p.day);
      if (i != null) values[i] += p.value;
    }
    return [{ name: a.slug, slug: a.slug, color: appColor(a.slug), values }];
  });
  return {
    users: sum((k) => k.users),
    newUsers: sum((k) => k.newUsers),
    prevNewUsers: sum((k) => k.newUsers, "prev"),
    mau: sum((k) => k.mau),
    paying: sum((k) => k.paying),
    signups: { days, series },
    live: Object.values(snaps).filter((s) => s.status === "ok" || s.status === "partial").length,
    total: apps.length,
  };
}

export type Attention = { slug: string; level: "critical" | "warn" | "info"; title: string; detail?: string };

/** Everything that wants the founder: dead connections, failing metrics and non-zero "lower is better" health numbers. */
export function attention(snaps: Record<string, AppSnapshot>): Attention[] {
  const out: Attention[] = [];
  for (const a of apps) {
    const s = snaps[a.slug];
    if (!s) continue;
    if (s.status === "unreachable") out.push({ slug: a.slug, level: "critical", title: "Database unreachable", detail: s.note });
    else if (s.status === "not_configured") out.push({ slug: a.slug, level: "info", title: "Not connected yet", detail: `Set ${a.envVar} to start reading it.` });
    else if (s.status === "partial") out.push({ slug: a.slug, level: "info", title: s.note ?? "Some metrics unavailable" });
    for (const m of a.metrics) {
      if (m.kind !== "stat" || m.good !== "down" || m.section !== "health") continue;
      const r = result(s, m.id, "stat");
      if (r?.value && r.value > 0) out.push({ slug: a.slug, level: m.headline ? "critical" : "warn", title: m.label, detail: String(Math.round(r.value * 10) / 10) });
    }
  }
  const rank = { critical: 0, warn: 1, info: 2 } as const;
  return out.sort((x, y) => rank[x.level] - rank[y.level]);
}

export const headlineStats = (a: AppDashboard) => a.metrics.filter((m) => m.kind === "stat" && m.headline);
