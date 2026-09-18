"use client";

import { motion } from "framer-motion";

/** A single animated completion ring, Apple-Activity style. */
export function ProgressRing({ pct, color, size = 120, stroke = 10, label, sub }: { pct: number; color: string; size?: number; stroke?: number; label?: string; sub?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label ?? "Completion"} ${pct}%`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={{ strokeDashoffset: c }}
          whileInView={{ strokeDashoffset: c * (1 - pct / 100) }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="fill-fg" style={{ fontSize: size * 0.22, fontWeight: 700, letterSpacing: "-0.02em" }}>
          {pct}%
        </text>
      </svg>
      {label ? <p className="text-sm font-medium">{label}</p> : null}
      {sub ? <p className="-mt-1 text-xs text-fg-subtle">{sub}</p> : null}
    </div>
  );
}

/** Four concentric rings — the whole portfolio in one glance. Outer to inner follows the given order. */
export function RingCluster({ items, size = 260 }: { items: { label: string; pct: number; color: string }[]; size?: number }) {
  const stroke = Math.max(8, Math.round(size / 22));
  const gap = 4;
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={items.map((i) => `${i.label} ${i.pct}%`).join(", ")}>
        {items.map((it, i) => {
          const r = (size - stroke) / 2 - i * (stroke + gap);
          const c = 2 * Math.PI * r;
          return (
            <g key={it.label}>
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
              <motion.circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={it.color}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={c}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                initial={{ strokeDashoffset: c }}
                whileInView={{ strokeDashoffset: c * (1 - it.pct / 100) }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: i * 0.12 }}
              />
            </g>
          );
        })}
      </svg>
      <ul className="grid gap-3">
        {items.map((it) => (
          <li key={it.label} className="flex items-center gap-3">
            <span className="size-3 rounded-full" style={{ background: it.color }} aria-hidden />
            <span className="w-28 text-sm font-medium">{it.label}</span>
            <span className="text-sm tabular-nums text-fg-muted">{it.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
