import type { Window } from "./types";

/** Calendar date (YYYY-MM-DD) of an instant in a time zone. */
export function zonedDate(d: Date, tz: string): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return p; // en-CA is ISO-shaped
}

/** Offset (ms) of a time zone from UTC at an instant. */
function offsetMs(at: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(at));
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second")) - Math.floor(at / 1000) * 1000;
}

/** The instant a calendar date starts in a time zone. */
export function startOfZonedDay(ymd: string, tz: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d);
  const first = guess - offsetMs(guess, tz);
  return new Date(guess - offsetMs(first, tz));
}

export const addDays = (ymd: string, n: number) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

/** "Last N days" ending with today (in tz); the previous window is the N days before. */
export function lastDays(days: number, tz: string, now = new Date()): Window {
  const today = zonedDate(now, tz);
  const start = startOfZonedDay(addDays(today, -(days - 1)), tz);
  const end = startOfZonedDay(addDays(today, 1), tz);
  const prevStart = startOfZonedDay(addDays(today, -(2 * days - 1)), tz);
  return { start, end, prevStart, tz, days };
}

/** Explicit calendar range [fromYmd, toYmdInclusive]; the previous window is the same length before it. */
export function dateRange(fromYmd: string, toYmd: string, tz: string): Window {
  const start = startOfZonedDay(fromYmd, tz);
  const end = startOfZonedDay(addDays(toYmd, 1), tz);
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
  const prevStart = startOfZonedDay(addDays(fromYmd, -days), tz);
  return { start, end, prevStart, tz, days };
}

/** The most recent complete calendar month before `now`, with the month before it as "previous". */
export function lastCalendarMonth(tz: string, now = new Date()): Window {
  const today = zonedDate(now, tz);
  const [y, m] = today.split("-").map(Number);
  const first = (yy: number, mm: number) => `${yy}-${String(mm).padStart(2, "0")}-01`;
  const prevM = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 };
  const prevPrevM = prevM.m === 1 ? { y: prevM.y - 1, m: 12 } : { y: prevM.y, m: prevM.m - 1 };
  const start = startOfZonedDay(first(prevM.y, prevM.m), tz);
  const end = startOfZonedDay(first(y, m), tz);
  const prevStart = startOfZonedDay(first(prevPrevM.y, prevPrevM.m), tz);
  return { start, end, prevStart, tz, days: Math.round((end.getTime() - start.getTime()) / 86_400_000) };
}

/** The last 7 complete days (not including today), with the 7 before as "previous". */
export function lastCompleteWeek(tz: string, now = new Date()): Window {
  const today = zonedDate(now, tz);
  const end = startOfZonedDay(today, tz);
  const start = startOfZonedDay(addDays(today, -7), tz);
  const prevStart = startOfZonedDay(addDays(today, -14), tz);
  return { start, end, prevStart, tz, days: 7 };
}

/** Every calendar date in the window, for zero-filling charts. */
export function daysIn(w: Window): string[] {
  const out: string[] = [];
  let d = zonedDate(w.start, w.tz);
  const last = zonedDate(new Date(w.end.getTime() - 1), w.tz);
  for (let i = 0; i < 400 && d <= last; i++) {
    out.push(d);
    d = addDays(d, 1);
  }
  return out;
}

export const windowLabel = (w: Window) => {
  const f = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: w.tz, day: "numeric", month: "short" }).format(d);
  return `${f(w.start)} – ${f(new Date(w.end.getTime() - 1))}`;
};
