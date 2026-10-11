import { dashboardConfig } from "./config";
import { loadAll } from "./load";
import { buildNewsletter, type Cadence, type Newsletter } from "./newsletter";
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

export async function compose(period: Period, fresh = true): Promise<{ n: Newsletter; w: Window }> {
  const { w, cadence } = windowFor(period);
  const snaps = await loadAll(w, fresh);
  return { n: buildNewsletter({ snaps, w, cadence }), w };
}

/** Sends to a list. The message key (period + start day) gives a retried send the same Message-ID, so inboxes show it once. */
export async function deliver(period: Period, to: string[], opts?: { test?: boolean }) {
  const { n, w } = await compose(period, true);
  const key = `nl-${opts?.test ? "test" : "all"}-${period}-${zonedDate(w.start, w.tz)}-${zonedDate(new Date(), w.tz)}${opts?.test ? `-${to[0]}` : ""}`.slice(0, 250);
  const r = await sendMail({ to, subject: `${opts?.test ? "[Test] " : ""}${n.subject}`, html: n.html, text: n.text, messageKey: key });
  return { result: r, subject: n.subject };
}
