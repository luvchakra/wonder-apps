import { Pool, types } from "pg";
import { demoEnabled, demoSnapshot } from "./demo";
import { daysIn } from "./window";
import type { AppDashboard, AppSnapshot, MetricDef, MetricResult, Window } from "./types";

// Keep DATE as 'YYYY-MM-DD' (the default parser makes a local-midnight Date) and bigint/numeric as numbers.
types.setTypeParser(1082, (v) => v);
types.setTypeParser(20, (v) => Number(v));
types.setTypeParser(1700, (v) => Number(v));

const g = globalThis as unknown as { __waPools?: Map<string, Pool>; __waCache?: Map<string, { at: number; p: Promise<AppSnapshot> }> };
const pools = (g.__waPools ??= new Map());
const cache = (g.__waCache ??= new Map());

const TTL_MS = 120_000;
const STATEMENT_TIMEOUT = "8s";
const CONCURRENCY = 3;

/**
 * Belt and braces: only a single SELECT/WITH statement is ever accepted, and no write keyword
 * may appear. The real guard is the read-only transaction and the read-only database role.
 */
export function assertReadOnlySql(sql: string, where: string) {
  const s = sql.replace(/--[^\n]*/g, "").replace(/'[^']*'/g, "''").trim().replace(/;\s*$/, "");
  if (!/^(select|with)\b/i.test(s) || s.includes(";")) throw new Error(`Dashboard metric ${where} is not a single SELECT statement.`);
  if (/\b(insert\s+into|update\s+[\w".]+\s+set|delete\s+from|drop\s|alter\s|create\s|grant\s|revoke\s|truncate\s|copy\s|call\s)/i.test(s))
    throw new Error(`Dashboard metric ${where} contains a write keyword.`);
}

function poolFor(app: AppDashboard): Pool | null {
  const url = process.env[app.envVar];
  if (!url) return null;
  const existing = pools.get(app.slug);
  if (existing) return existing;
  const local = /localhost|127\.0\.0\.1/.test(url);
  const ca = process.env[`${app.envVar.replace(/_DATABASE_URL$/, "")}_DATABASE_CA`];
  const ssl = local || process.env.DASHBOARD_DB_SSL === "off" ? undefined : ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false };
  const pool = new Pool({ connectionString: url, max: CONCURRENCY, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 6_000, ssl, application_name: "wonderapps-dashboard" });
  pool.on("error", () => {
    /* idle client errors must not crash the function */
  });
  pools.set(app.slug, pool);
  return pool;
}

const clean = (m: string) =>
  m
    .replace(/postgres(ql)?:\/\/\S+/gi, "[connection string]")
    .replace(/\s+/g, " ")
    .slice(0, 160);

/** Labels and series names must be categories; anything that looks like an email never leaves the server. */
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const safeLabel = (v: unknown) => {
  const s = String(v ?? "").trim() || "Unknown";
  return EMAIL.test(s) ? "(hidden)" : s.length > 48 ? `${s.slice(0, 47)}…` : s;
};
const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

function shape(def: MetricDef, rows: Record<string, unknown>[], w: Window): MetricResult {
  switch (def.kind) {
    case "stat":
      return { id: def.id, kind: "stat", value: num(rows[0]?.value), prev: rows[0] && "prev" in rows[0] ? num(rows[0].prev) : null };
    case "series": {
      const known = new Set(daysIn(w));
      return {
        id: def.id,
        kind: "series",
        points: rows
          .filter((r) => known.has(String(r.day)))
          .map((r) => ({ day: String(r.day), value: num(r.value) ?? 0, ...(r.series != null ? { series: safeLabel(r.series) } : {}) })),
      };
    }
    case "breakdown": {
      const all = rows.map((r) => ({ label: safeLabel(r.label), value: num(r.value) ?? 0 })).filter((r) => r.value > 0);
      all.sort((a, b) => b.value - a.value);
      const top = all.slice(0, 8);
      const rest = all.slice(8).reduce((s, r) => s + r.value, 0);
      return { id: def.id, kind: "breakdown", items: rest > 0 ? [...top, { label: "Other", value: rest }] : top };
    }
    case "funnel":
      return {
        id: def.id,
        kind: "funnel",
        steps: [...rows].sort((a, b) => Number(a.step) - Number(b.step)).map((r) => ({ label: safeLabel(r.label), value: num(r.value) ?? 0 })),
      };
    case "cohort": {
      const by = new Map<string, { size: number; weeks: (number | null)[] }>();
      for (const r of rows) {
        const c = String(r.cohort);
        const e = by.get(c) ?? { size: num(r.size) ?? 0, weeks: [] };
        e.size = num(r.size) ?? e.size;
        e.weeks[Number(r.week)] = e.size > 0 ? Math.min(100, ((num(r.active) ?? 0) / e.size) * 100) : null;
        by.set(c, e);
      }
      const cohorts = [...by.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).slice(-8).map(([cohort, e]) => ({ cohort, size: e.size, weeks: Array.from(e.weeks, (x) => x ?? null) }));
      return { id: def.id, kind: "cohort", cohorts };
    }
  }
}

/** Postgres rejects extra bound parameters, so bind only as many as the query references ($1..$4). */
function paramsFor(sql: string, w: Window) {
  const max = Math.max(0, ...[...sql.matchAll(/\$(\d)/g)].map((m) => Number(m[1])));
  return [w.start, w.end, w.prevStart, w.tz].slice(0, Math.min(4, max));
}

async function runMetric(pool: Pool, def: MetricDef, w: Window): Promise<MetricResult> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN READ ONLY");
    await client.query(`SET LOCAL statement_timeout = '${STATEMENT_TIMEOUT}'`);
    const { rows } = await client.query(def.sql, paramsFor(def.sql, w));
    return shape(def, rows, w);
  } catch (e) {
    return { id: def.id, kind: "error", message: clean(e instanceof Error ? e.message : "query failed") };
  } finally {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* connection is being released anyway */
    }
    client.release();
  }
}

async function snapshot(app: AppDashboard, w: Window): Promise<AppSnapshot> {
  if (demoEnabled()) return demoSnapshot(app, w);
  const fetchedAt = new Date().toISOString();
  const pool = poolFor(app);
  if (!pool) return { slug: app.slug, status: "not_configured", note: `${app.envVar} is not set.`, results: {}, fetchedAt };

  // One cheap probe first, so an unreachable database costs one timeout, not thirty.
  try {
    await pool.query("SELECT 1");
  } catch (e) {
    return { slug: app.slug, status: "unreachable", note: clean(e instanceof Error ? e.message : "could not connect"), results: {}, fetchedAt };
  }

  const results: Record<string, MetricResult> = {};
  const queue = [...app.metrics];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let m = queue.shift(); m; m = queue.shift()) results[m.id] = await runMetric(pool, m, w);
    }),
  );
  const failed = Object.values(results).filter((r) => r.kind === "error").length;
  return { slug: app.slug, status: failed === 0 ? "ok" : "partial", note: failed ? `${failed} of ${app.metrics.length} metrics could not be read.` : undefined, results, fetchedAt };
}

/** Snapshot of one app for a window, cached for two minutes so refreshes never hammer a database. */
export function getSnapshot(app: AppDashboard, w: Window, opts?: { fresh?: boolean }): Promise<AppSnapshot> {
  const key = `${app.slug}|${w.start.toISOString()}|${w.end.toISOString()}|${w.tz}`;
  const hit = cache.get(key);
  if (!opts?.fresh && hit && Date.now() - hit.at < TTL_MS) return hit.p;
  const p = snapshot(app, w);
  cache.set(key, { at: Date.now(), p });
  if (cache.size > 60) for (const [k, v] of cache) if (Date.now() - v.at > TTL_MS) cache.delete(k);
  return p;
}
