import { dashboardConfig } from "./config";
import { collectAndStore, readPeriod, type StoredPeriodData } from "./store";
import { buildNewsletter, type Cadence, type Newsletter } from "./newsletter";
import { dashProducts, namesOf } from "./products";
import { getProgressHistory } from "@/lib/content/load";
import { addDays, changesSince } from "@/lib/progress/trends";
import { sendMail } from "./mail";
import type { Window } from "./types";
import { lastCalendarMonth, lastCompleteWeek, lastDays, zonedDate } from "./window";

export type Period = "weekly" | "monthly" | "7d" | "30d" | "90d";
export const PERIODS: { key: Period; label: string; hint: string }[] = [
  { key: "weekly", label: "Last full week", hint: "The seven complete days before today (the Monday email)" },
  { key: "monthly", label: "Last full month", hint: "The previous calendar month (the 1st-of-the-month email)" },
  { key: "7d", label: "7 days to now", hint: "Rolling, includes today so far" },
  { key: "30d", label: "30 days to now", hint: "Rolling, includes today so far" },
  { key: "90d", label: "90 days to now", hint: "Rolling, includes today so far" },
];

export const parsePeriod = (v: string | null | undefined): Period => (PERIODS.some((p) => p.key === v) ? (v as Period) : "weekly");

export function windowFor(period: Period): { w: Window; cadence: Cadence } {
  const tz = dashboardConfig.timeZone();
  switch (period) {
    case "weekly":
      return { w: lastCompleteWeek(tz), cadence: "weekly" };
    case "monthly":
      return { w: lastCalendarMonth(tz), cadence: "monthly" };
    default:
      return { w: lastDays(Number.parseInt(period, 10), tz), cadence: "custom" };
  }
}

/**
 * Builds a briefing from the stored numbers. With `ensureToday` (every real send), a period whose
 * stored row isn't from today is collected and stored first, so an email never goes out on
 * yesterday's figures; the preview just shows what is stored.
 */
export async function compose(period: Period, opts: { ensureToday?: boolean } = {}): Promise<{ n: Newsletter; w: Window; asOf: string | null; empty: boolean }> {
  const { w: fallback, cadence } = windowFor(period);
  let d: StoredPeriodData = await readPeriod(period);
  if (opts.ensureToday && d.capturedOn !== zonedDate(new Date(), fallback.tz)) {
    const c = await collectAndStore([period]);
    // Without a write key (local runs) the collected numbers are used as they are.
    d = c.ok ? await readPeriod(period) : (c.periods[period] ?? d);
  }
  const w = d.w ?? fallback;
  const snaps = d.snaps;
  const [products, history] = await Promise.all([
    dashProducts(),
    getProgressHistory().catch((e: unknown) => {
      console.error("[newsletter] progress history unavailable:", e instanceof Error ? e.message : e);
      return null;
    }),
  ]);
  // The period's last day against the day before it began, so the change is what happened inside it.
  const lastDay = zonedDate(new Date(w.end.getTime() - 1), w.tz);
  const progress = history ? changesSince(history, products.map((p) => p.slug), addDays(zonedDate(w.start, w.tz), -1), lastDay) : null;
  return { n: buildNewsletter({ snaps, w, cadence, names: namesOf(products), progress }), w, asOf: d.asOf, empty: Object.keys(snaps).length === 0 };
}

/** Sends to a list. The message key (period + start day) gives a retried send the same Message-ID, so inboxes show it once. */
export async function deliver(period: Period, to: string[], opts?: { test?: boolean }) {
  const { n, w } = await compose(period, { ensureToday: true });
  const key = `nl-${opts?.test ? "test" : "all"}-${period}-${zonedDate(w.start, w.tz)}-${zonedDate(new Date(), w.tz)}${opts?.test ? `-${to[0]}` : ""}`.slice(0, 250);
  const r = await sendMail({ to, subject: `${opts?.test ? "[Test] " : ""}${n.subject}`, html: n.html, text: n.text, messageKey: key });
  return { result: r, subject: n.subject };
}
