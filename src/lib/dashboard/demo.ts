import { dashboardConfig } from "./config";
import type { AppDashboard, AppSnapshot, MetricDef, MetricResult, Window } from "./types";
import { daysIn } from "./window";

/**
 * Synthetic numbers so the dashboard can be designed, reviewed and screenshotted with no
 * database. Only ever active when DASHBOARD_DEMO=1 AND NODE_ENV is not production, so a real
 * deployment can never show invented figures.
 */
export const demoEnabled = () => process.env.DASHBOARD_DEMO === "1" && !dashboardConfig.isProd();

function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}

function one(app: AppDashboard, m: MetricDef, w: Window): MetricResult {
  const r = rng(`${app.slug}:${m.id}`);
  const base = m.kind === "stat" && m.format === "pct" ? 20 + r() * 60 : m.kind === "stat" && (m.format === "inr" || m.format === "usd") ? 5000 + r() * 90000 : 20 + r() * 600;
  switch (m.kind) {
    case "stat": {
      const v = Math.round(base * (m.snapshot ? 6 : 1) * 10) / 10;
      return { id: m.id, kind: "stat", value: m.format === "pct" ? Math.min(99, v) : v, prev: m.snapshot ? null : Math.round(v * (0.7 + r() * 0.6) * 10) / 10 };
    }
    case "series": {
      const days = daysIn(w);
      const names = m.stacked ? ["Web", "iOS", "Android"] : [undefined];
      const points = names.flatMap((name, k) => days.map((day, i) => ({ day, value: Math.round(Math.max(0, base / 10 / (k + 1) * (1 + 0.35 * Math.sin(i / 2.2 + k) + (r() - 0.5) * 0.5) + i * 0.08)), ...(name ? { series: name } : {}) })));
      return { id: m.id, kind: "series", points };
    }
    case "breakdown": {
      const labels = ["Free", "Pro", "Max", "Trial", "Other"];
      return { id: m.id, kind: "breakdown", items: labels.map((label, i) => ({ label, value: Math.round(base * (1 / (i + 1)) * (0.8 + r() * 0.4)) })) };
    }
    case "funnel": {
      let v = Math.round(base * 5);
      const labels = ["Signed up", "Finished setup", "First action", "Second action", "Back in week 2"];
      return { id: m.id, kind: "funnel", steps: labels.map((label) => ({ label, value: (v = Math.round(v * (0.55 + r() * 0.3))) })) };
    }
    case "cohort": {
      const cohorts = Array.from({ length: 8 }, (_, c) => ({
        cohort: new Date(w.end.getTime() - (8 - c) * 7 * 86_400_000).toISOString().slice(0, 10),
        size: Math.round(40 + r() * 120),
        weeks: Array.from({ length: 8 - c }, (_, k) => (k === 0 ? 100 : Math.max(4, 62 * Math.pow(0.72, k) + r() * 8))),
      }));
      return { id: m.id, kind: "cohort", cohorts };
    }
  }
}

export function demoSnapshot(app: AppDashboard, w: Window): AppSnapshot {
  const results: Record<string, MetricResult> = {};
  for (const m of app.metrics) results[m.id] = one(app, m, w);
  return { slug: app.slug, status: "ok", note: "Demo data", results, fetchedAt: new Date().toISOString() };
}
