import Link from "next/link";
import { CalendarClock, Check, Download, X } from "lucide-react";
import { SendButtons } from "@/components/dashboard/SendButtons";
import { Card } from "@/components/dashboard/parts";
import { dashboardConfig } from "@/lib/dashboard/config";
import { compose, PERIODS, parsePeriod } from "@/lib/dashboard/newsletter-run";
import { requireSession } from "@/lib/dashboard/session";
import { mailConfigured } from "@/lib/mailer";

export const dynamic = "force-dynamic";

/** Next occurrence of the cron schedule in vercel.json (UTC), shown in the founder's time zone. */
function nextRun(kind: "weekly" | "monthly", tz: string) {
  const now = new Date();
  const at = (y: number, m: number, d: number, h: number, min: number) => new Date(Date.UTC(y, m, d, h, min));
  let t: Date;
  if (kind === "weekly") {
    t = at(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 3, 30);
    while (t.getUTCDay() !== 1 || t <= now) t = new Date(t.getTime() + 86_400_000);
  } else {
    t = at(now.getUTCFullYear(), now.getUTCMonth(), 1, 3, 45);
    if (t <= now) t = at(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 3, 45);
  }
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(t);
}

const mask = (e: string) => e.replace(/^(.).*(@.*)$/, "$1•••$2");

export default async function NewsletterPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const session = await requireSession();
  const period = parsePeriod((await searchParams).period);
  const { n } = await compose(period, false);
  const cadence = dashboardConfig.cadence();
  const recipients = dashboardConfig.recipients();
  const tz = dashboardConfig.timeZone();
  const checks = [
    { ok: mailConfigured(), label: "Email (SMTP)", env: "SMTP_PASS" },
    { ok: (process.env.CRON_SECRET ?? "").length >= 16, label: "Scheduler secret", env: "CRON_SECRET" },
    { ok: recipients.length > 0, label: `${recipients.length} recipient${recipients.length === 1 ? "" : "s"}`, env: "NEWSLETTER_RECIPIENTS" },
  ];

  return (
    <div className="grid grid-cols-1 gap-8">
      <header className="dash-rise">
        <p className="dash-eyebrow">Newsletter</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Briefings that write themselves.</h1>
        <p className="mt-2 max-w-2xl text-[15px]" style={{ color: "var(--d-ink-2)" }}>
          A weekly and a monthly email with the numbers that moved, drafted from live data and sent on schedule. Preview any period below, send yourself a test, or send to the list.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        <div className="grid grid-cols-1 gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="tablist" aria-label="Period" className="inline-flex flex-wrap gap-1 rounded-full p-1" style={{ background: "rgba(255,255,255,0.06)" }}>
              {PERIODS.map((p) => (
                <Link key={p.key} href={`/dashboard/newsletter?period=${p.key}`} role="tab" aria-selected={p.key === period} title={p.hint} className="rounded-full px-3.5 py-1.5 text-xs font-medium" style={{ background: p.key === period ? "#fff" : "transparent", color: p.key === period ? "#0c0c0e" : "#c3c2b7" }}>
                  {p.label}
                </Link>
              ))}
            </div>
            <a href={`/api/dashboard/newsletter/preview?period=${period}&download=1`} className="inline-flex items-center gap-1.5 text-xs underline-offset-4 hover:underline" style={{ color: "#c3c2b7" }}>
              <Download className="size-3.5" /> Download HTML
            </a>
          </div>

          <div className="dash-card overflow-hidden p-0">
            <div className="border-b px-5 py-3 text-xs" style={{ borderColor: "var(--d-line)", color: "#8c8b84" }}>
              <span style={{ color: "#c3c2b7" }}>Subject</span> · <span style={{ color: "#fff" }}>{n.subject}</span>
            </div>
            <iframe title="Newsletter preview" srcDoc={n.html} sandbox="" className="block h-[820px] w-full border-0" style={{ background: "#f2f2f4" }} />
          </div>
          <SendButtons period={period} recipientCount={recipients.length} />
        </div>

        <div className="grid grid-cols-1 content-start gap-4">
          <Card title="Automatic sends" hint="Scheduled by Vercel Cron; switch either on or off with NEWSLETTER_CADENCE.">
            <ul className="grid grid-cols-1 gap-3 text-sm">
              {(["weekly", "monthly"] as const).map((k) => (
                <li key={k} className="flex items-start gap-3">
                  <CalendarClock className="mt-0.5 size-4 shrink-0" style={{ color: cadence.has(k) ? "#199e70" : "#8c8b84" }} />
                  <span>
                    <span style={{ color: "#fff" }}>{k === "weekly" ? "Weekly" : "Monthly"}</span> <span style={{ color: cadence.has(k) ? "#bfe8bf" : "#8c8b84" }}>{cadence.has(k) ? "on" : "off"}</span>
                    <span className="block text-xs" style={{ color: "#8c8b84" }}>{cadence.has(k) ? `Next: ${nextRun(k, tz)}` : "Not scheduled"}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Setup check">
            <ul className="grid grid-cols-1 gap-2.5 text-sm">
              {checks.map((c) => (
                <li key={c.env} className="flex items-start gap-3">
                  {c.ok ? <Check className="mt-0.5 size-4 shrink-0" style={{ color: "#0ca30c" }} /> : <X className="mt-0.5 size-4 shrink-0" style={{ color: "#e66767" }} />}
                  <span style={{ color: "#c3c2b7" }}>
                    {c.label}
                    <code className="mt-0.5 block text-[11px]" style={{ color: "#8c8b84" }}>{c.env}</code>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Recipients" hint="NEWSLETTER_RECIPIENTS, comma-separated. Falls back to the people allowed to sign in.">
            <ul className="grid grid-cols-1 gap-1.5 text-sm" style={{ color: "#c3c2b7" }}>
              {recipients.length ? recipients.map((r) => <li key={r}>{r === session.email ? r : mask(r)}</li>) : <li style={{ color: "#8c8b84" }}>None yet.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
