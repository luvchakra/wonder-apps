import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { RANGES, type RangeKey } from "@/lib/dashboard/types";

/** One row above the content it scopes: presets first, then refresh. Everything below re-renders for the same slice. */
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
      <Link href={`${base}?range=${current}&fresh=1`} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors hover:bg-white/10" style={{ color: "#c3c2b7" }} title="Skip the two-minute cache and read the databases now">
        <RefreshCw className="size-3.5" /> Refresh
      </Link>
      <span className="text-xs" style={{ color: "#8c8b84" }}>{stamp}</span>
    </div>
  );
}
