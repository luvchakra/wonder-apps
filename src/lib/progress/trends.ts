import type { ProgressRow } from "@/content/progress";
import type { Snapshot } from "@/lib/content/load";

/**
 * Turning recorded snapshots into daily series. A product's tracker is recorded on the days it
 * changed (backfill) and every day since recording began (cron), so a day without a snapshot
 * carries the previous one forward: the tracker said the same thing that day. Days before a
 * product's first snapshot are null, never zero.
 */

const DAY = 86_400_000;
export const addDays = (ymd: string, n: number) => new Date(Date.parse(`${ymd}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

export function dayRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export const activeOf = (s: Pick<Snapshot, "total" | "set_aside">) => s.total - s.set_aside;
/** Floored, like every completion figure on the site. */
export const pctOf = (s: Pick<Snapshot, "done" | "total" | "set_aside">) => (activeOf(s) > 0 ? Math.floor((s.done / activeOf(s)) * 100) : 0);

/** One value per day per product, carried forward between snapshots. */
export function dailySeries(history: Snapshot[], slugs: string[], metric: (s: Snapshot) => number, until: string) {
  const first = history.reduce<string | null>((m, s) => (m === null || s.captured_on < m ? s.captured_on : m), null);
  if (!first) return { days: [] as string[], values: {} as Record<string, (number | null)[]> };
  const days = dayRange(first, until);
  const values: Record<string, (number | null)[]> = {};
  for (const slug of slugs) {
    const snaps = history.filter((s) => s.product_slug === slug).sort((a, b) => a.captured_on.localeCompare(b.captured_on));
    let j = -1;
    values[slug] = days.map((d) => {
      while (j + 1 < snaps.length && snaps[j + 1].captured_on <= d) j++;
      return j >= 0 ? metric(snaps[j]) : null;
    });
  }
  return { days, values };
}

/** The snapshot in effect on a day: the latest one recorded on or before it. */
export function asOf<T extends { snapshot: Pick<Snapshot, "captured_on"> }>(list: T[], day: string): T | null {
  let hit: T | null = null;
  for (const x of list) if (x.snapshot.captured_on <= day && (!hit || x.snapshot.captured_on > hit.snapshot.captured_on)) hit = x;
  return hit;
}

export type ModuleMove = { id: string; name: string; doneNow: number; activeNow: number; doneThen: number | null; status: string };

/** Each row of the latest snapshot next to the same row on an earlier day (null when it didn't exist yet). */
export function moduleMoves(now: ProgressRow[], then: ProgressRow[] | null): ModuleMove[] {
  return now.map((r) => {
    const t = then?.find((x) => x.id === r.id && x.name === r.name) ?? then?.find((x) => x.id === r.id) ?? null;
    return { id: r.id, name: r.name, doneNow: r.done, activeNow: r.total - r.setAside, doneThen: t ? t.done : null, status: r.status };
  });
}

export type ProgressChange = { slug: string; done: number; active: number; pct: number; doneThen: number | null; activeThen: number | null; asOf: string };

/** Each product's numbers on `until` and what they were on `since` (null when nothing was recorded by then). */
export function changesSince(history: Snapshot[], slugs: string[], since: string, until: string): ProgressChange[] {
  return slugs.flatMap((slug) => {
    const snaps = history.filter((s) => s.product_slug === slug && s.captured_on <= until).sort((a, b) => a.captured_on.localeCompare(b.captured_on));
    const last = snaps[snaps.length - 1];
    if (!last) return [];
    const then = [...snaps].reverse().find((s) => s.captured_on <= since) ?? null;
    return [{ slug, done: last.done, active: activeOf(last), pct: pctOf(last), doneThen: then?.done ?? null, activeThen: then ? activeOf(then) : null, asOf: last.captured_on }];
  });
}
