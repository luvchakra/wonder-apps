import { dashboardConfig } from "./config";
import { getSnapshot } from "./db";
import { apps, appBySlug } from "./registry";
import type { AppDashboard, AppSnapshot, MetricDef, MetricResult, RangeKey, Window } from "./types";
import { RANGES } from "./types";
import { lastDays } from "./window";

export function parseRange(raw: string | string[] | undefined): { key: RangeKey; window: Window } {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const key: RangeKey = v === "7d" || v === "90d" ? v : "30d";
  return { key, window: lastDays(RANGES[key].days, dashboardConfig.timeZone()) };
}

export async function loadAll(w: Window, fresh = false): Promise<Record<string, AppSnapshot>> {
  const entries = await Promise.all(apps.map(async (a) => [a.slug, await getSnapshot(a, w, { fresh })] as const));
  return Object.fromEntries(entries);
}

export async function loadOne(slug: string, w: Window, fresh = false) {
  const app = appBySlug(slug);
  return app ? { app, snap: await getSnapshot(app, w, { fresh }) } : null;
}

export const result = <K extends MetricResult["kind"]>(snap: AppSnapshot | undefined, id: string, kind: K) => {
  const r = snap?.results[id];
  return r && r.kind === kind ? (r as Extract<MetricResult, { kind: K }>) : null;
};

export const defsOf = <K extends MetricDef["kind"]>(app: AppDashboard, kind: K) => app.metrics.filter((m): m is Extract<MetricDef, { kind: K }> => m.kind === kind);
