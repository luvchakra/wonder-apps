/**
 * The founder dashboard's metric contract.
 *
 * WonderApps has no database of its own. Each product exposes a READ-ONLY
 * Postgres connection (`<APP>_DATABASE_URL`, set in Vercel) and every number on
 * the dashboard is one of the fixed, parameter-free SQL queries defined in
 * `apps/<slug>.ts`. Queries return aggregates only — never rows about people.
 *
 * SQL parameters (all bound, never interpolated):
 *   $1 timestamptz  window start (inclusive)
 *   $2 timestamptz  window end (exclusive)
 *   $3 timestamptz  previous window start (same length as the window, ending at $1)
 *   $4 text         IANA time zone used to bucket days (e.g. 'Asia/Kolkata')
 * A query may use any subset, but must not use $5+.
 */

export type Format = "int" | "decimal" | "pct" | "inr" | "usd" | "hours" | "text";

/** Where a metric is drawn on an app page. */
export type SectionId = "audience" | "engagement" | "product" | "revenue" | "ai" | "health";

export const SECTION_TITLES: Record<SectionId, { title: string; blurb: string }> = {
  audience: { title: "Audience & growth", blurb: "Who is signing up, who comes back, who stays." },
  engagement: { title: "Engagement", blurb: "What people actually do in the product." },
  product: { title: "Product depth", blurb: "The features that make this product itself." },
  revenue: { title: "Revenue & plans", blurb: "Plans, paying customers and recurring revenue." },
  ai: { title: "AI usage", blurb: "Runs, volume and cost of the AI behind the product." },
  health: { title: "Health & trust", blurb: "Failures, backlog, security and anything that needs you." },
};

type Base = {
  /** Unique within the app, kebab-case. */
  id: string;
  label: string;
  /** One short sentence: how it is counted. Shown in a tooltip and the newsletter footnotes. */
  hint?: string;
  section: SectionId;
};

/**
 * One number. SQL returns exactly one row: `value numeric` and (optionally)
 * `prev numeric` — the same measure for the previous window — to draw a delta.
 * For point-in-time totals (e.g. "total users") omit `prev`; for those, set `snapshot: true`
 * so the UI doesn't present them as range-bound.
 */
export type StatDef = Base & {
  kind: "stat";
  format: Format;
  sql: string;
  /** Which direction is good news. Defaults to "up". "neutral" suppresses red/green. */
  good?: "up" | "down" | "neutral";
  snapshot?: boolean;
  /** Mark the handful of numbers that lead the app page and the newsletter (max 6 per app). */
  headline?: boolean;
};

/**
 * A daily series. SQL returns sparse rows `(day date, value numeric)` and, for stacked
 * charts, an optional third column `series text`. Days with no rows are drawn as zero.
 * Bucket days with `date_trunc('day', ts AT TIME ZONE $4)::date`.
 */
export type SeriesDef = Base & {
  kind: "series";
  format: Format;
  sql: string;
  /** Stack by the `series` column instead of a single line. */
  stacked?: boolean;
  style?: "area" | "bars";
};

/** Share of a whole. SQL returns `(label text, value numeric)`; the UI keeps the top 8 and folds the rest. */
export type BreakdownDef = Base & {
  kind: "breakdown";
  format: Format;
  sql: string;
};

/** Ordered steps. SQL returns `(step int, label text, value numeric)`; each step is a subset of the previous. */
export type FunnelDef = Base & {
  kind: "funnel";
  sql: string;
};

/**
 * Weekly retention. SQL returns `(cohort date, week int, active int, size int)` where `cohort` is
 * the week people signed up in, `week` is 0..N weeks after, `active` how many of the cohort were
 * active in that week and `size` the cohort size (repeated on each row). Window: last 8 cohorts.
 */
export type CohortDef = Base & {
  kind: "cohort";
  sql: string;
};

export type MetricDef = StatDef | SeriesDef | BreakdownDef | FunnelDef | CohortDef;

export type AppDashboard = {
  slug: string; // matches startups[].slug
  /** Env var holding the read-only Postgres URL. */
  envVar: string;
  /** What the founder should read first about this product, in one line. */
  focus: string;
  /** Plain-language note on how "active" is defined for this app. */
  activeDefinition: string;
  metrics: MetricDef[];
};

/* --- results ----------------------------------------------------------- */

export type Point = { day: string; value: number; series?: string };

export type MetricResult =
  | { id: string; kind: "stat"; value: number | null; prev: number | null }
  | { id: string; kind: "series"; points: Point[] }
  | { id: string; kind: "breakdown"; items: { label: string; value: number }[] }
  | { id: string; kind: "funnel"; steps: { label: string; value: number }[] }
  | { id: string; kind: "cohort"; cohorts: { cohort: string; size: number; weeks: (number | null)[] }[] }
  | { id: string; kind: "error"; message: string };

export type AppSnapshot = {
  slug: string;
  status: "ok" | "partial" | "not_configured" | "unreachable";
  /** Human-readable reason when not ok. */
  note?: string;
  results: Record<string, MetricResult>;
  fetchedAt: string;
};

export type RangeKey = "7d" | "30d" | "90d";
export const RANGES: Record<RangeKey, { days: number; label: string }> = {
  "7d": { days: 7, label: "Last 7 days" },
  "30d": { days: 30, label: "Last 30 days" },
  "90d": { days: 90, label: "Last 90 days" },
};

export type Window = { start: Date; end: Date; prevStart: Date; tz: string; days: number };
