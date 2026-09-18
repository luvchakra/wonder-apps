import type { ProgressRow } from "@/content/progress";

type Counts = Pick<ProgressRow, "total" | "done" | "partial" | "notStarted" | "setAside">;

/**
 * A thin segmented bar over the full story count: done (good) · in progress
 * (warning) · not started (neutral track) · set aside (hatched neutral, so a
 * deliberate descoping is visibly different from a gap without spending a
 * status hue on it). Text never wears the segment colour.
 */
export function StatusBar({ row, className = "", height = "h-2" }: { row: Counts; className?: string; height?: string }) {
  const pct = (n: number) => (row.total > 0 ? (n / row.total) * 100 : 0);
  const active = row.total - row.setAside;
  return (
    <div
      className={`${height} w-full overflow-hidden rounded-full bg-[var(--track)] ${className}`}
      role="img"
      aria-label={`${row.done} of ${active} done${row.partial ? `, ${row.partial} in progress` : ""}${row.setAside ? `, ${row.setAside} set aside` : ""}`}
    >
      <div className="flex h-full gap-px">
        {row.done > 0 ? <div className="h-full bg-[var(--good)]" style={{ width: `${pct(row.done)}%` }} /> : null}
        {row.partial > 0 ? <div className="h-full bg-[var(--warn)]" style={{ width: `${pct(row.partial)}%` }} /> : null}
        {row.notStarted > 0 ? <div className="h-full" style={{ width: `${pct(row.notStarted)}%` }} /> : null}
        {row.setAside > 0 ? <div className="hatch h-full" style={{ width: `${pct(row.setAside)}%` }} /> : null}
      </div>
    </div>
  );
}

export function StatusLegend({ className = "" }: { className?: string }) {
  const items = [
    { swatch: "bg-[var(--good)]", label: "Done" },
    { swatch: "bg-[var(--warn)]", label: "In progress" },
    { swatch: "bg-[var(--track)]", label: "Not started" },
    { swatch: "hatch", label: "Set aside / superseded" },
  ];
  return (
    <ul className={`flex flex-wrap items-center gap-x-5 gap-y-2 ${className}`}>
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2 text-xs text-fg-muted">
          <span className={`inline-block size-2.5 rounded-full ${i.swatch}`} aria-hidden />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/** One wide bar for the whole portfolio, with direct labels on segments wide enough to hold them. */
export function PortfolioStackedBar({ row }: { row: Counts }) {
  const segs = [
    { key: "done", n: row.done, cls: "bg-[var(--good)] text-white", label: "Done" },
    { key: "partial", n: row.partial, cls: "bg-[var(--warn)] text-black", label: "In progress" },
    { key: "notStarted", n: row.notStarted, cls: "bg-[var(--track)] text-fg", label: "Not started" },
    { key: "setAside", n: row.setAside, cls: "hatch text-fg", label: "Set aside" },
  ].filter((s) => s.n > 0);
  return (
    <div className="flex h-14 w-full gap-0.5 overflow-hidden rounded-2xl" role="img" aria-label={segs.map((s) => `${s.label} ${s.n}`).join(", ")}>
      {segs.map((s) => {
        const w = (s.n / row.total) * 100;
        return (
          <div key={s.key} className={`relative flex h-full items-center justify-center ${s.cls}`} style={{ width: `${w}%` }} title={`${s.label}: ${s.n} stories (${Math.round(w)}%)`}>
            {w >= 9 ? (
              <span className="px-2 text-center text-xs font-semibold leading-tight">
                {s.n}
                <span className="block text-[10px] font-medium opacity-80">{s.label}</span>
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
