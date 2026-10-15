import { TRACKER_SOURCES, type ParsedTracker } from "@/lib/tracker-parsers";
import { restRpc } from "@/lib/content/supabase";
import { scrub } from "@/lib/scrub";

/**
 * Records today's snapshot of every product's public tracker in the database. Same files and
 * same parsers as /appstracker, so the history matches what the tracker showed that day. A
 * product whose file can't be read or parsed is skipped (and reported), never recorded as
 * zeros; the first snapshot of a day wins, so re-running is harmless.
 */

export type RecordPayload = {
  product_slug: string;
  captured_on: string;
  source: "live" | "backfill";
  source_commit?: string | null;
  source_last_updated: string | null;
  current_focus: string | null;
  rows: ParsedTracker["rows"];
};

export function payloadFor(slug: string, parsed: ParsedTracker, capturedOn: string, source: RecordPayload["source"], commit?: string): RecordPayload {
  if (!parsed.rows.length) throw new Error(`${slug}: tracker has no rows`);
  return {
    product_slug: slug,
    captured_on: capturedOn,
    source,
    source_commit: commit ?? null,
    source_last_updated: parsed.lastUpdated,
    current_focus: parsed.currentFocus ? scrub(parsed.currentFocus) ?? null : null,
    rows: parsed.rows.map((r) => ({ ...r, name: scrub(r.name) ?? r.name, ...(r.note ? { note: scrub(r.note) } : {}) })),
  };
}

/** Today's date (YYYY-MM-DD) in the founder's time zone. */
export function today(timeZone = process.env.DASHBOARD_TIMEZONE || "Asia/Kolkata"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export type RecordResult = { slug: string; ok: true; snapshotId: number | null } | { slug: string; ok: false; error: string };

export async function recordAll(writeKey: string, capturedOn = today()): Promise<RecordResult[]> {
  return Promise.all(
    Object.entries(TRACKER_SOURCES).map(async ([slug, source]): Promise<RecordResult> => {
      try {
        const res = await fetch(source.raw, { signal: AbortSignal.timeout(8000), cache: "no-store" });
        if (!res.ok) throw new Error(`GitHub returned ${res.status}`);
        const payload = payloadFor(slug, source.parse(await res.text()), capturedOn, "live");
        const snapshotId = await restRpc<number | null>("record_progress_snapshot", { write_key: writeKey, payload });
        return { slug, ok: true, snapshotId };
      } catch (e) {
        return { slug, ok: false, error: (e instanceof Error ? e.message : "failed").slice(0, 200) };
      }
    }),
  );
}
