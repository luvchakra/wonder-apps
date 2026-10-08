import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Info, Minus, Sparkles } from "lucide-react";
import { delta, formatExact, formatValue, tone, type Delta } from "@/lib/dashboard/format";
import type { Format } from "@/lib/dashboard/types";

/* Status colours are marks, never text colours: the arrow carries the tone, the words stay in ink. */
const TONE = { good: "#0ca30c", bad: "#e66767", neutral: "#8c8b84" } as const;

export function DeltaChip({ d, good = "up", suffix = "vs previous" }: { d: Delta | null; good?: "up" | "down" | "neutral"; suffix?: string }) {
  if (!d) return null;
  const t = tone(d, good);
  const Icon = d.dir === "up" || d.dir === "new" ? ArrowUpRight : d.dir === "down" ? ArrowDownRight : Minus;
  return (
    <span className="inline-flex items-center gap-1 text-xs" style={{ color: "#c3c2b7" }}>
      <span className="grid size-4 place-items-center rounded-full" style={{ background: `color-mix(in oklab, ${TONE[t]} 22%, transparent)` }}>
        <Icon className="size-3" style={{ color: TONE[t] }} aria-hidden />
      </span>
      <strong className="font-semibold tabular-nums" style={{ color: "#fff" }}>{d.text}</strong>
      <span style={{ color: "#8c8b84" }}>{suffix}</span>
    </span>
  );
}

/** A thin line with a soft fill. Decorative: the number beside it carries the meaning. */
export function Sparkline({ values, color, height = 36, width = 120 }: { values: number[]; color: string; height?: number; width?: number }) {
  if (values.length < 2) return <div style={{ height }} aria-hidden />;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * width, height - 3 - (v / max) * (height - 8)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const id = `sp-${Math.abs(values.reduce((s, v, i) => s + v * (i + 1), 0) | 0)}-${color.slice(1)}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" aria-hidden style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${width},${height} L0,${height} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function StatTile({
  label,
  value,
  prev,
  format,
  good,
  hint,
  snapshot,
  color,
  spark,
  big = false,
}: {
  label: string;
  value: number | null;
  prev?: number | null;
  format: Format;
  good?: "up" | "down" | "neutral";
  hint?: string;
  snapshot?: boolean;
  color: string;
  spark?: number[];
  big?: boolean;
}) {
  const d = snapshot ? null : delta(value, prev);
  return (
    <div className="dash-card flex flex-col p-5" title={value != null ? formatExact(value, format) : undefined}>
      <div className="flex items-start justify-between gap-2">
        <p className="dash-eyebrow">{label}</p>
        {hint ? (
          <span title={hint} aria-label={hint} className="shrink-0 cursor-help" style={{ color: "#8c8b84" }}>
            <Info className="size-3.5" />
          </span>
        ) : null}
      </div>
      <p className={`mt-3 font-semibold tabular-nums tracking-tight ${big ? "text-5xl" : "text-[2rem]"}`} style={{ color: "#fff", lineHeight: 1 }}>
        {formatValue(value, format)}
      </p>
      <div className="mt-3 min-h-5">{snapshot ? <span className="text-xs" style={{ color: "#8c8b84" }}>as of now</span> : <DeltaChip d={d} good={good} />}</div>
      {spark ? (
        <div className="mt-4">
          <Sparkline values={spark} color={color} />
        </div>
      ) : (
        <span className="mt-auto" />
      )}
    </div>
  );
}

export function Card({ title, hint, children, className = "", right }: { title: string; hint?: string; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <section className={`dash-card p-5 sm:p-6 ${className}`}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold" style={{ color: "#fff" }}>{title}</h3>
          {hint ? <p className="mt-1 max-w-xl text-xs leading-relaxed" style={{ color: "#8c8b84" }}>{hint}</p> : null}
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}

/** Share of a whole as ranked bars: one hue, label left, value and share right. */
export function BreakdownBars({ items, color, format }: { items: { label: string; value: number }[]; color: string; format: Format }) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const max = Math.max(...items.map((i) => i.value), 1);
  if (!items.length) return <Empty />;
  return (
    <ul className="grid gap-2.5">
      {items.map((i) => (
        <li key={i.label} title={`${i.label}: ${formatExact(i.value, format)} (${((i.value / total) * 100).toFixed(1)}%)`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate" style={{ color: "#c3c2b7" }}>{i.label}</span>
            <span className="shrink-0 tabular-nums" style={{ color: "#8c8b84" }}>
              <strong style={{ color: "#fff" }}>{formatValue(i.value, format)}</strong> · {((i.value / total) * 100).toFixed(0)}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
            <div className="h-full rounded-full" style={{ width: `${Math.max(2, (i.value / max) * 100)}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Ordered steps, each a subset of the one above: bar length is the count, labels carry conversion. */
export function FunnelBars({ steps, color }: { steps: { label: string; value: number }[]; color: string }) {
  if (!steps.length) return <Empty />;
  const top = Math.max(steps[0].value, 1);
  return (
    <ol className="grid gap-2.5">
      {steps.map((s, i) => {
        const fromTop = (s.value / top) * 100;
        const fromPrev = i === 0 ? null : steps[i - 1].value > 0 ? (s.value / steps[i - 1].value) * 100 : 0;
        return (
          <li key={s.label} title={`${s.label}: ${s.value.toLocaleString("en-IN")} (${fromTop.toFixed(0)}% of the first step)`}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
              <span style={{ color: "#c3c2b7" }}>
                <span className="mr-2 tabular-nums" style={{ color: "#8c8b84" }}>{i + 1}</span>
                {s.label}
              </span>
              <span className="tabular-nums" style={{ color: "#8c8b84" }}>
                <strong style={{ color: "#fff" }}>{s.value.toLocaleString("en-IN")}</strong>
                {fromPrev != null ? ` · ${fromPrev.toFixed(0)}% of previous` : ""}
              </span>
            </div>
            <div className="h-6 overflow-hidden rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-lg" style={{ width: `${Math.max(1.5, fromTop)}%`, background: `color-mix(in oklab, ${color} ${Math.round(100 - i * (45 / Math.max(1, steps.length - 1)))}%, #1a1a19)` }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function Empty({ children = "Nothing to show for this period yet." }: { children?: ReactNode }) {
  return (
    <p className="flex items-center gap-2 rounded-xl px-3 py-4 text-sm" style={{ background: "rgba(255,255,255,0.03)", color: "#8c8b84" }}>
      <Sparkles className="size-4 shrink-0" aria-hidden /> {children}
    </p>
  );
}

export function StatusPill({ status }: { status: "ok" | "partial" | "not_configured" | "unreachable" }) {
  const map = {
    ok: { t: "Live", c: "#0ca30c" },
    partial: { t: "Partly available", c: "#fab219" },
    not_configured: { t: "Not connected", c: "#8c8b84" },
    unreachable: { t: "Unreachable", c: "#e66767" },
  } as const;
  const m = map[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: "#c3c2b7" }}>
      <span className="size-2 rounded-full" style={{ background: m.c }} aria-hidden />
      {m.t}
    </span>
  );
}
