import { NextResponse } from "next/server";
import { TRACKER_SOURCES } from "@/lib/tracker-parsers";
import type { ProgressRow } from "@/content/progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type TrackerRefreshResult =
  | { slug: string; ok: true; rows: ProgressRow[]; lastUpdated: string | null; currentFocus: string | null }
  | { slug: string; ok: false; error: string };

async function fetchOne(slug: string, source: (typeof TRACKER_SOURCES)[string]): Promise<TrackerRefreshResult> {
  try {
    const res = await fetch(source.raw, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!res.ok) return { slug, ok: false, error: `GitHub returned ${res.status}` };
    const md = await res.text();
    const parsed = source.parse(md);
    return { slug, ok: true, rows: parsed.rows, lastUpdated: parsed.lastUpdated, currentFocus: parsed.currentFocus };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { slug, ok: false, error: message.length > 200 ? message.slice(0, 200) : message };
  }
}

// GET only: this reads four public GitHub files server-side (avoids browser CORS) and
// never accepts input, so there is nothing here for a caller to inject or abuse.
export async function GET() {
  const entries = Object.entries(TRACKER_SOURCES);
  const results = await Promise.all(entries.map(([slug, source]) => fetchOne(slug, source)));
  return NextResponse.json(
    { fetchedAt: new Date().toISOString(), results },
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=45, stale-while-revalidate=120" } },
  );
}
