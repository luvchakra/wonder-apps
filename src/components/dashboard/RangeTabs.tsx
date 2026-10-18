import Link from "next/link";
import { RANGES, type RangeKey } from "@/lib/dashboard/types";

/** One row above the content it scopes: presets first, then how fresh the numbers are. Everything below re-renders for the same slice. */
export function RangeTabs({ base, current, stamp }: { base: string; current: RangeKey; stamp: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div role="tablist" aria-label="Date range" className="inline-flex rounded-full p-1" style={{ background: "rgba(255,255,255,0.06)" }}>
        {(Object.keys(RANGES) as RangeKey[]).map((k) => (
          <Link
            key={k}
            href={`${base}?range=${k}`}
            role="tab"
            aria-selected={k === current}
            className="rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors"
            style={{ background: k === current ? "#fff" : "transparent", color: k === current ? "#0c0c0e" : "#c3c2b7" }}
          >
            {RANGES[k].label.replace("Last ", "")}
          </Link>
        ))}
      </div>
      <span className="text-xs" style={{ color: "#8c8b84" }}>{stamp}</span>
    </div>
  );
}
