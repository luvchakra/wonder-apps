"use client";

import { motion } from "framer-motion";

/**
 * Horizontal bar chart on one shared 0–100 axis. Identity is the product
 * (categorical by entity, fixed order → sorted by value only for reading
 * ease, colour still follows the entity), value labels are direct, grid is
 * recessive, marks are thin with a rounded data end.
 */
export function CompletionBars({ items }: { items: { label: string; pct: number; color: string; detail: string }[] }) {
  const sorted = [...items].sort((a, b) => b.pct - a.pct);
  return (
    <div className="relative">
      {/* recessive gridlines */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-[9.5rem] right-12 hidden sm:block">
        {[25, 50, 75, 100].map((g) => (
          <div key={g} className="absolute inset-y-0 border-l border-line" style={{ left: `${g}%` }}>
            <span className="absolute -top-5 -translate-x-1/2 text-[10px] tabular-nums text-fg-subtle">{g}%</span>
          </div>
        ))}
      </div>
      <ul className="grid gap-4 pt-4">
        {sorted.map((it, i) => (
          <li key={it.label} className="grid items-center gap-3 sm:grid-cols-[9.5rem_1fr_3rem]">
            <span className="text-sm font-medium">{it.label}</span>
            <div className="h-3 rounded-full bg-[var(--track)]" title={it.detail}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: it.color }}
                initial={{ width: 0 }}
                whileInView={{ width: `${it.pct}%` }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 }}
              />
            </div>
            <span className="text-right text-sm font-semibold tabular-nums">{it.pct}%</span>
            <span className="-mt-2 text-xs text-fg-subtle sm:col-start-2">{it.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
