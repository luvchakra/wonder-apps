import { restRpc } from "@/lib/content/supabase";
import { dashboardConfig } from "./config";
import { collectSnapshot } from "./db";
import { demoEnabled, demoSnapshot } from "./demo";
import { apps } from "./registry";
import type { AppSnapshot, Window } from "./types";
import { lastCalendarMonth, lastCompleteWeek, lastDays, zonedDate } from "./window";

/**
 * The dashboard's numbers live in WonderApps' own database (private.dashboard_snapshots,
 * migration 0004), not in the products at request time. Collection runs once a day (Vercel
 * Cron), when the founder presses Refresh, and when a newsletter's period has no row from
 * today; it is the only code that opens a product database. Pages and newsletters read the
 * latest stored row per product and period. Rows are finished aggregates only.
 *
 * The database functions require PROGRESS_WRITE_KEY (the same key as the progress recorder)
 * for both writing and reading, because the rows are not public.
 */

export type StoredPeriod = "7d" | "30d" | "90d" | "weekly" | "monthly";
export const STORED_PERIODS: StoredPeriod[] = ["7d", "30d", "90d", "weekly", "monthly"];

export function windowForPeriod(period: StoredPeriod, tz = dashboardConfig.timeZone(), now = new Date()): Window {
  if (period === "weekly") return lastCompleteWeek(tz, now);
  if (period === "monthly") return lastCalendarMonth(tz, now);
  return lastDays(Number.parseInt(period, 10), tz, now);
}

const writeKey = () => process.env.PROGRESS_WRITE_KEY || "";

type Row = {
  product_slug: string;
  period: StoredPeriod;
  captured_on: string;
  window_start: string;
  window_end: string;
  window_prev_start: string;
  window_tz: string;
  window_days: number;
  status: AppSnapshot["status"];
  note: string | null;
  results: AppSnapshot["results"];
  fetched_at: string;
};

export type StoredPeriodData = {
  /** One snapshot per product that has a stored row for this period. */
  snaps: Record<string, AppSnapshot>;
  /** The window the stored numbers were computed for (null when nothing is stored). */
  w: Window | null;
  /** Oldest fetch time among the products, i.e. how fresh the whole page is. */
  asOf: string | null;
  /** The day (in the dashboard time zone) the rows were collected. */
  capturedOn: string | null;
};

export type StoreState = { state: "ok" | "empty" | "no_key" | "error"; error?: string; periods: Partial<Record<StoredPeriod, StoredPeriodData>> };

const emptyPeriod = (): StoredPeriodData => ({ snaps: {}, w: null, asOf: null, capturedOn: null });

function demoState(): StoreState {
  const periods: StoreState["periods"] = {};
  for (const p of STORED_PERIODS) {
    const w = windowForPeriod(p);
    const snaps = Object.fromEntries(apps.map((a) => [a.slug, demoSnapshot(a, w)]));
    periods[p] = { snaps, w, asOf: new Date().toISOString(), capturedOn: zonedDate(new Date(), w.tz) };
  }
  return { state: "ok", periods };
}

/** Every product's latest stored row for every period. Never throws: problems come back as a state. */
export async function readStored(): Promise<StoreState> {
  if (demoEnabled()) return demoState();
  const key = writeKey();
  if (!key) return { state: "no_key", periods: {} };
  let rows: Row[];
  try {
    rows = await restRpc<Row[]>("dashboard_snapshots_latest", { write_key: key });
  } catch (e) {
    const error = e instanceof Error ? e.message.slice(0, 200) : "read failed";
    console.error("[dashboard] stored numbers unavailable:", error);
    return { state: "error", error, periods: {} };
  }
  const known = new Set(apps.map((a) => a.slug));
  const periods: StoreState["periods"] = {};
  for (const r of rows) {
    if (!known.has(r.product_slug) || !STORED_PERIODS.includes(r.period)) continue;
    const p = (periods[r.period] ??= emptyPeriod());
    p.snaps[r.product_slug] = { slug: r.product_slug, status: r.status, note: r.note ?? undefined, results: r.results ?? {}, fetchedAt: r.fetched_at };
    // All products share one window per collection; if they differ (one product failed to store
    // in a later run), the most recent one wins for the labels.
    if (!p.capturedOn || r.captured_on >= p.capturedOn) {
      p.capturedOn = r.captured_on;
      p.w = { start: new Date(r.window_start), end: new Date(r.window_end), prevStart: new Date(r.window_prev_start), tz: r.window_tz, days: r.window_days };
    }
    if (!p.asOf || r.fetched_at < p.asOf) p.asOf = r.fetched_at;
  }
  return { state: Object.keys(periods).length ? "ok" : "empty", periods };
}

export async function readPeriod(period: StoredPeriod): Promise<StoredPeriodData & { state: StoreState["state"]; error?: string }> {
  const s = await readStored();
  return { ...(s.periods[period] ?? emptyPeriod()), state: s.periods[period] ? "ok" : s.state === "ok" ? "empty" : s.state, error: s.error };
}

export type CollectResult = {
  ok: boolean;
  stored: number;
  /** Per product: worst status across the periods collected. */
  products: { slug: string; status: AppSnapshot["status"]; note?: string }[];
  storeError?: string;
  ms: number;
  /** What was collected, so a caller without a write key (local dev) can still use it. */
  periods: Partial<Record<StoredPeriod, StoredPeriodData>>;
};

const RANK: Record<AppSnapshot["status"], number> = { ok: 0, partial: 1, not_configured: 2, unreachable: 3 };

/**
 * Collects the given periods for every product from the product databases and stores them as
 * today's rows (a later collection on the same day overwrites them). Products run in parallel,
 * each on its own small pool; periods run one after another within a product.
 */
export async function collectAndStore(periods: StoredPeriod[] = STORED_PERIODS): Promise<CollectResult> {
  const t0 = Date.now();
  const now = new Date();
  const tz = dashboardConfig.timeZone();
  const capturedOn = zonedDate(now, tz);
  const windows = Object.fromEntries(periods.map((p) => [p, windowForPeriod(p, tz, now)])) as Record<StoredPeriod, Window>;

  const perApp = await Promise.all(
    apps.map(async (a) => {
      const out: [StoredPeriod, AppSnapshot][] = [];
      for (const p of periods) {
        const snap = await collectSnapshot(a, windows[p]);
        out.push([p, snap]);
        // An unconfigured or unreachable product won't answer for the next period either.
        if (snap.status === "not_configured" || snap.status === "unreachable") {
          for (const rest of periods.slice(out.length)) out.push([rest, { ...snap }]);
          break;
        }
      }
      return { slug: a.slug, out };
    }),
  );

  const collected: CollectResult["periods"] = {};
  const rows: Row[] = [];
  for (const { slug, out } of perApp) {
    for (const [p, snap] of out) {
      const w = windows[p];
      const c = (collected[p] ??= { snaps: {}, w, asOf: null, capturedOn });
      c.snaps[slug] = snap;
      if (!c.asOf || snap.fetchedAt < c.asOf) c.asOf = snap.fetchedAt;
      rows.push({
        product_slug: slug,
        period: p,
        captured_on: capturedOn,
        window_start: w.start.toISOString(),
        window_end: w.end.toISOString(),
        window_prev_start: w.prevStart.toISOString(),
        window_tz: w.tz,
        window_days: w.days,
        status: snap.status,
        note: snap.note ?? null,
        results: snap.results,
        fetched_at: snap.fetchedAt,
      });
    }
  }

  const products = perApp.map(({ slug, out }) => {
    const worst = out.reduce((a, [, s]) => (RANK[s.status] > RANK[a.status] ? s : a), out[0][1]);
    return { slug, status: worst.status, note: worst.note };
  });

  let stored = 0;
  let storeError: string | undefined;
  const key = writeKey();
  if (demoEnabled()) storeError = "Demo mode: nothing is stored.";
  else if (!key) storeError = "PROGRESS_WRITE_KEY is not set, so the numbers can't be stored.";
  else {
    try {
      stored = await restRpc<number>("record_dashboard_snapshot", { write_key: key, payload: { rows: rows.map(toPayload) } });
    } catch (e) {
      storeError = e instanceof Error ? e.message.slice(0, 200) : "store failed";
    }
  }
  if (storeError) console.error("[dashboard] collection not stored:", storeError);
  return { ok: !storeError, stored, products, storeError, ms: Date.now() - t0, periods: collected };
}

const toPayload = (r: Row) => ({
  product_slug: r.product_slug,
  period: r.period,
  captured_on: r.captured_on,
  window: { start: r.window_start, end: r.window_end, prev_start: r.window_prev_start, tz: r.window_tz, days: r.window_days },
  status: r.status,
  note: r.note,
  results: r.results,
  fetched_at: r.fetched_at,
});

/* --- history ------------------------------------------------------------- */

export type StatHistory = {
  /** Every collected day, oldest first. */
  days: string[];
  /** product → day → metric id → value. */
  values: Record<string, Record<string, Record<string, number | null>>>;
  state: StoreState["state"];
};

/**
 * Each day's stored single-number results for one period (default: the rolling 7 days, so a
 * range metric reads as "the 7 days to that day" and a point-in-time metric as "that day").
 * History builds up from the first collection; nothing is back-filled or invented.
 */
export async function readStatHistory(period: StoredPeriod = "7d", days = 180): Promise<StatHistory> {
  const tz = dashboardConfig.timeZone();
  const since = zonedDate(new Date(Date.now() - days * 86_400_000), tz);
  if (demoEnabled()) return demoHistory(period, since);
  const key = writeKey();
  if (!key) return { days: [], values: {}, state: "no_key" };
  let rows: { product_slug: string; captured_on: string; stats: Record<string, unknown> }[];
  try {
    rows = await restRpc("dashboard_stat_history", { write_key: key, p_period: period, p_since: since });
  } catch (e) {
    console.error("[dashboard] stat history unavailable:", e instanceof Error ? e.message : e);
    return { days: [], values: {}, state: "error" };
  }
  const values: StatHistory["values"] = {};
  const set = new Set<string>();
  for (const r of rows) {
    set.add(r.captured_on);
    const out: Record<string, number | null> = {};
    for (const [k, v] of Object.entries(r.stats ?? {})) out[k] = typeof v === "number" && Number.isFinite(v) ? v : null;
    (values[r.product_slug] ??= {})[r.captured_on] = out;
  }
  const list = [...set].sort();
  return { days: list, values, state: list.length ? "ok" : "empty" };
}

/** One metric's values across the history's days (null where that day has no reading). */
export const historySeries = (h: StatHistory, slug: string, id: string | undefined) =>
  h.days.map((d) => (id ? (h.values[slug]?.[d]?.[id] ?? null) : null));

function demoHistory(period: StoredPeriod, since: string): StatHistory {
  const tz = dashboardConfig.timeZone();
  const shown: string[] = [];
  for (let i = 44; i >= 0; i--) {
    const d = zonedDate(new Date(Date.now() - i * 86_400_000), tz);
    if (d >= since) shown.push(d);
  }
  const values: StatHistory["values"] = {};
  for (const a of apps) {
    const base = demoSnapshot(a, windowForPeriod(period));
    values[a.slug] = Object.fromEntries(
      shown.map((d, i) => [
        d,
        Object.fromEntries(
          Object.values(base.results).flatMap((r) => (r.kind === "stat" && r.value != null ? [[r.id, Math.round(r.value * (0.6 + (0.4 * (i + 1)) / shown.length) * 10) / 10]] : [])),
        ),
      ]),
    );
  }
  return { days: shown, values, state: "ok" };
}
