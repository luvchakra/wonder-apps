import type { Format } from "./types";

const compact = (n: number, d = 1) => {
  const a = Math.abs(n);
  if (a >= 1e9) return `${(n / 1e9).toFixed(d).replace(/\.0+$/, "")}B`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(d).replace(/\.0+$/, "")}M`;
  if (a >= 1e4) return `${(n / 1e3).toFixed(d).replace(/\.0+$/, "")}k`;
  return Math.round(n).toLocaleString("en-IN");
};

/** Indian grouping for rupees: ₹1.2L, ₹3.4Cr. */
const inr = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e7) return `₹${(n / 1e7).toFixed(2).replace(/\.?0+$/, "")}Cr`;
  if (a >= 1e5) return `₹${(n / 1e5).toFixed(2).replace(/\.?0+$/, "")}L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
};

export function formatValue(v: number | null | undefined, f: Format): string {
  if (v == null || !Number.isFinite(v)) return "—";
  switch (f) {
    case "int":
      return compact(v);
    case "decimal":
      return Math.abs(v) >= 100 ? compact(v) : v.toFixed(1).replace(/\.0$/, "");
    case "pct":
      return `${v.toFixed(Math.abs(v) < 10 ? 1 : 0).replace(/\.0$/, "")}%`;
    case "inr":
      return inr(v);
    case "usd":
      return `$${Math.abs(v) >= 1e4 ? compact(v) : v.toLocaleString("en-US", { maximumFractionDigits: v < 100 ? 2 : 0 })}`;
    case "hours":
      return v < 1 ? `${Math.round(v * 60)} min` : v < 48 ? `${v.toFixed(1).replace(/\.0$/, "")} h` : `${(v / 24).toFixed(1).replace(/\.0$/, "")} d`;
    case "text":
      return String(v);
  }
}

/** Exact figure for tooltips and tables. */
export const formatExact = (v: number | null | undefined, f: Format) =>
  v == null || !Number.isFinite(v) ? "—" : f === "int" ? Math.round(v).toLocaleString("en-IN") : formatValue(v, f);

export type Delta = { text: string; dir: "up" | "down" | "flat" | "new"; pct: number | null };

/** Relative change versus the previous window. */
export function delta(value: number | null, prev: number | null | undefined): Delta | null {
  if (value == null || prev == null) return null;
  if (prev === 0) return value === 0 ? { text: "no change", dir: "flat", pct: 0 } : { text: "new", dir: "new", pct: null };
  const pct = ((value - prev) / Math.abs(prev)) * 100;
  if (Math.abs(pct) < 0.5) return { text: "flat", dir: "flat", pct };
  return { text: `${pct > 0 ? "+" : "−"}${Math.abs(pct) >= 100 ? Math.round(Math.abs(pct)) : Math.abs(pct).toFixed(0)}%`, dir: pct > 0 ? "up" : "down", pct };
}

/** Is a delta good news, given which direction is good for the metric? */
export function tone(d: Delta | null, good: "up" | "down" | "neutral" = "up"): "good" | "bad" | "neutral" {
  if (!d || d.dir === "flat" || good === "neutral") return "neutral";
  if (d.dir === "new") return good === "up" ? "good" : "bad";
  return (d.dir === "up") === (good === "up") ? "good" : "bad";
}

export const shortDay = (ymd: string) => {
  const [, m, d] = ymd.split("-").map(Number);
  return `${d} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]}`;
};
