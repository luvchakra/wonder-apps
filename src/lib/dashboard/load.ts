import { dashboardConfig } from "./config";
import { appBySlug } from "./registry";
import { readPeriod, windowForPeriod } from "./store";
import type { AppDashboard, AppSnapshot, MetricDef, MetricResult, RangeKey, Window } from "./types";
import { RANGES } from "./types";
import { lastDays } from "./window";

export function parseRange(raw: string | string[] | undefined): { key: RangeKey; window: Window } {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const key: RangeKey = v === "7d" || v === "90d" ? v : "30d";
  return { key, window: lastDays(RANGES[key].days, dashboardConfig.timeZone()) };
}

/**
 * Pages read the numbers WonderApps stored (store.ts), never a product database. The window is
 * the one the numbers were computed for, so labels match the data even late in the day.
 * When nothing is stored yet, `state` says why and the page shows an empty state.
 */
export async function loadStored(key: RangeKey) {
  const d = await readPeriod(key);
  return { ...d, w: d.w ?? windowForPeriod(key) };
}

export async function loadOne(slug: string, key: RangeKey) {
  const app = appBySlug(slug);
  if (!app) return null;
  const d = await loadStored(key);
  return { app, snap: d.snaps[slug] ?? null, d };
}

export const result = <K extends MetricResult["kind"]>(snap: AppSnapshot | undefined, id: string, kind: K) => {
  const r = snap?.results[id];
  return r && r.kind === kind ? (r as Extract<MetricResult, { kind: K }>) : null;
};

export const defsOf = <K extends MetricDef["kind"]>(app: AppDashboard, kind: K) => app.metrics.filter((m): m is Extract<MetricDef, { kind: K }> => m.kind === kind);
