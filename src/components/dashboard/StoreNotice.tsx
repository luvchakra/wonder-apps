import { DatabaseZap } from "lucide-react";

/** "18 Oct, 09:12" in the dashboard's time zone. */
export function asOfLabel(iso: string | null, tz: string): string {
  if (!iso) return "never";
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
}

/** Shown instead of numbers when nothing has been collected and stored yet. */
export function NoStoredData({ state, error }: { state: "ok" | "empty" | "no_key" | "error"; error?: string }) {
  const why =
    state === "no_key"
      ? "This deployment has no PROGRESS_WRITE_KEY, so it can't read the stored numbers."
      : state === "error"
        ? `The stored numbers couldn't be read (${error ?? "database error"}).`
        : "Nothing has been collected yet for this period.";
  return (
    <section className="dash-card flex items-start gap-4 p-6" aria-live="polite">
      <DatabaseZap className="mt-0.5 size-5 shrink-0" style={{ color: "#c3c2b7" }} aria-hidden />
      <div>
        <h2 className="text-[15px] font-semibold" style={{ color: "#fff" }}>No numbers to show yet</h2>
        <p className="mt-1 max-w-xl text-sm leading-relaxed" style={{ color: "#c3c2b7" }}>
          {why} Numbers are collected from each product once a day; press <strong>Refresh</strong> at the top to collect them now.
        </p>
      </div>
    </section>
  );
}
