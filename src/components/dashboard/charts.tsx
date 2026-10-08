"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatExact, formatValue, shortDay } from "@/lib/dashboard/format";
import type { Format } from "@/lib/dashboard/types";

export type ChartSeries = { name: string; color: string; values: number[] };

const AXIS = "#8c8b84";
const GRID = "rgba(255,255,255,0.07)";
const SURFACE = "#1a1a19";

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.max(260, el.clientWidth)));
    ro.observe(el);
    setW(Math.max(260, el.clientWidth));
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/**
 * Daily series as an area (one series) or bars (stacked or single). One shared x for every
 * series, so the crosshair tooltip lists them all; values lead, names follow. Legend whenever
 * there are two or more series; a table view is one click away.
 */
export function TimeChart({
  days,
  series,
  format,
  kind = "area",
  stacked = false,
  height = 220,
  label,
}: {
  days: string[];
  series: ChartSeries[];
  format: Format;
  kind?: "area" | "bars";
  stacked?: boolean;
  height?: number;
  label: string;
}) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);

  const padL = 38;
  const padR = 8;
  const padT = 10;
  const padB = 24;
  const iw = width - padL - padR;
  const ih = height - padT - padB;
  const n = days.length;

  const totals = useMemo(() => days.map((_, i) => series.reduce((s, x) => s + (x.values[i] ?? 0), 0)), [days, series]);
  const maxV = niceMax(Math.max(...(stacked ? totals : series.flatMap((s) => s.values)), 0));
  const x = (i: number) => padL + (kind === "bars" ? (iw / n) * (i + 0.5) : n === 1 ? iw / 2 : (iw / (n - 1)) * i);
  const y = (v: number) => padT + ih - (v / maxV) * ih;
  const ticks = [0, 0.5, 1].map((t) => t * maxV);
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 76))));

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const i = kind === "bars" ? Math.floor(((px - padL) / iw) * n) : Math.round(((px - padL) / iw) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  };

  const tipLeft = hover == null ? 0 : x(hover);
  const flip = tipLeft > width * 0.6;

  return (
    <div>
      <div ref={ref} className="relative" style={{ height }}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${label}. ${series.map((s) => s.name).join(", ")} per day, ${shortDay(days[0])} to ${shortDay(days[n - 1])}.`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          style={{ touchAction: "pan-y", display: "block" }}
        >
          <defs>
            {series.map((s, k) => (
              <linearGradient key={k} id={`g-${label.replace(/\W/g, "")}-${k}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.32" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} stroke={GRID} />
              <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill={AXIS}>
                {formatValue(t, format)}
              </text>
            </g>
          ))}
          {days.map((d, i) =>
            i % every === 0 || i === n - 1 ? (
              <text key={d} x={x(i)} y={height - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize="11" fill={AXIS}>
                {shortDay(d)}
              </text>
            ) : null,
          )}

          {kind === "bars"
            ? days.map((d, i) => {
                const bw = Math.max(2, Math.min(28, (iw / n) * 0.7));
                let acc = 0;
                return (
                  <g key={d} opacity={hover == null || hover === i ? 1 : 0.55}>
                    {(stacked ? series : series.slice(0, 1)).map((s, k) => {
                      const v = s.values[i] ?? 0;
                      const y0 = y(acc);
                      const y1 = y(acc + v);
                      if (stacked) acc += v;
                      const h = Math.max(0, y0 - y1 - (stacked && k > 0 ? 2 : 0));
                      if (v <= 0) return null;
                      return <rect key={k} x={x(i) - bw / 2} y={y1} width={bw} height={h} rx={Math.min(4, bw / 2)} fill={s.color} stroke={SURFACE} strokeWidth={0} />;
                    })}
                  </g>
                );
              })
            : series.map((s, k) => {
                const pts = s.values.map((v, i) => `${x(i)},${y(v)}`);
                return (
                  <g key={k}>
                    {series.length === 1 ? <path d={`M${x(0)},${y(0)} L${pts.join(" L")} L${x(n - 1)},${y(0)} Z`} fill={`url(#g-${label.replace(/\W/g, "")}-${k})`} /> : null}
                    <path d={`M${pts.join(" L")}`} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  </g>
                );
              })}

          {hover != null ? (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + ih} stroke="rgba(255,255,255,0.28)" />
              {kind === "area"
                ? series.map((s, k) => <circle key={k} cx={x(hover)} cy={y(s.values[hover] ?? 0)} r={4} fill={s.color} stroke={SURFACE} strokeWidth={2} />)
                : null}
            </g>
          ) : null}
        </svg>
        {hover != null ? (
          <div className="dash-tip" style={{ top: 8, left: flip ? undefined : Math.min(tipLeft + 14, width - 170), right: flip ? Math.max(8, width - tipLeft + 14) : undefined }}>
            <p style={{ color: "#8c8b84", marginBottom: 6 }}>{shortDay(days[hover])}</p>
            {series.map((s) => (
              <p key={s.name} className="flex items-center gap-2" style={{ margin: "3px 0" }}>
                <span style={{ width: 12, height: 3, borderRadius: 2, background: s.color, flex: "none" }} />
                <strong style={{ color: "#fff", fontSize: 13 }}>{formatExact(s.values[hover] ?? 0, format)}</strong>
                <span style={{ color: "#c3c2b7" }}>{s.name}</span>
              </p>
            ))}
            {series.length > 1 && stacked ? (
              <p style={{ margin: "6px 0 0", paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.1)", color: "#c3c2b7" }}>
                <strong style={{ color: "#fff" }}>{formatExact(totals[hover], format)}</strong> total
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {series.length > 1 ? (
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs" style={{ color: "#c3c2b7" }}>
            {series.map((s) => (
              <li key={s.name} className="flex items-center gap-1.5">
                <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />
                {s.name}
              </li>
            ))}
          </ul>
        ) : (
          <span />
        )}
        <button type="button" onClick={() => setTable((t) => !t)} className="text-xs underline-offset-4 hover:underline" style={{ color: "#8c8b84" }} aria-expanded={table}>
          {table ? "Hide table" : "View as table"}
        </button>
      </div>
      {table ? (
        <div className="mt-3 max-h-56 overflow-auto rounded-xl border text-xs" style={{ borderColor: "rgba(255,255,255,0.09)" }}>
          <table className="w-full">
            <thead style={{ color: "#8c8b84", position: "sticky", top: 0, background: "#212120" }}>
              <tr>
                <th className="px-3 py-2 text-left font-medium">Day</th>
                {series.map((s) => (
                  <th key={s.name} className="px-3 py-2 text-right font-medium">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((d, i) => (
                <tr key={d} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <td className="px-3 py-1.5" style={{ color: "#c3c2b7" }}>{shortDay(d)}</td>
                  {series.map((s) => (
                    <td key={s.name} className="px-3 py-1.5 text-right tabular-nums">
                      {formatExact(s.values[i] ?? 0, format)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

/** Weekly retention heat-grid: one hue, light to dark; every cell is its own hover target. */
export function CohortGrid({ cohorts, color, label }: { cohorts: { cohort: string; size: number; weeks: (number | null)[] }[]; color: string; label: string }) {
  const [tip, setTip] = useState<{ c: string; w: number; v: number; size: number } | null>(null);
  const cols = Math.max(...cohorts.map((c) => c.weeks.length), 1);
  return (
    <div className="relative" role="table" aria-label={label}>
      <div className="grid gap-1 text-[11px]" style={{ gridTemplateColumns: `76px 44px repeat(${cols}, minmax(0, 1fr))`, color: "#8c8b84" }} role="row">
        <span>Cohort</span>
        <span className="text-right">Size</span>
        {Array.from({ length: cols }, (_, w) => (
          <span key={w} className="text-center">
            {w === 0 ? "Wk 0" : `+${w}`}
          </span>
        ))}
      </div>
      <div className="mt-1.5 grid gap-1">
        {cohorts.map((c) => (
          <div key={c.cohort} className="grid items-center gap-1 text-xs" style={{ gridTemplateColumns: `76px 44px repeat(${cols}, minmax(0, 1fr))` }} role="row">
            <span style={{ color: "#c3c2b7" }}>{shortDay(c.cohort)}</span>
            <span className="text-right tabular-nums" style={{ color: "#8c8b84" }}>{c.size}</span>
            {Array.from({ length: cols }, (_, w) => {
              const v = c.weeks[w];
              const has = v != null;
              return (
                <button
                  key={w}
                  type="button"
                  disabled={!has}
                  onPointerEnter={() => has && setTip({ c: c.cohort, w, v: v as number, size: c.size })}
                  onPointerLeave={() => setTip(null)}
                  onFocus={() => has && setTip({ c: c.cohort, w, v: v as number, size: c.size })}
                  onBlur={() => setTip(null)}
                  className="h-8 rounded-md text-[11px] tabular-nums outline-offset-2 focus-visible:outline focus-visible:outline-white"
                  style={{
                    background: has ? `color-mix(in oklab, ${color} ${Math.round(10 + (v as number) * 0.85)}%, #1a1a19)` : "transparent",
                    border: has ? "none" : "1px dashed rgba(255,255,255,0.07)",
                    color: has && (v as number) > 28 ? "#fff" : "#c3c2b7",
                  }}
                  aria-label={has ? `Cohort ${shortDay(c.cohort)}, week ${w}: ${(v as number).toFixed(0)} percent active` : undefined}
                >
                  {has ? `${(v as number).toFixed(0)}` : ""}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs" style={{ color: "#8c8b84" }}>
        {tip ? (
          <>
            <strong style={{ color: "#fff" }}>{tip.v.toFixed(1)}%</strong> of the {tip.size} who joined the week of {shortDay(tip.c)} were active {tip.w === 0 ? "in their first week" : `${tip.w} week${tip.w > 1 ? "s" : ""} later`}.
          </>
        ) : (
          "Percent of each signup-week cohort that came back, week by week."
        )}
      </p>
    </div>
  );
}
