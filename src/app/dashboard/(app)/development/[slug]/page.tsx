import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { TimeChart } from "@/components/dashboard/charts";
import { DevMarkdown } from "@/components/dashboard/DevMarkdown";
import { Card, Empty } from "@/components/dashboard/parts";
import { shortDay } from "@/lib/dashboard/format";
import { getProductHistory } from "@/lib/content/load";
import { today } from "@/lib/progress/record";
import { activeOf, addDays, asOf, dailySeries, moduleMoves } from "@/lib/progress/trends";
import { DevBar, DevFacts, DevStats, DevTabs, updatedLabel } from "@/components/dashboard/DevParts";
import { dashProducts } from "@/lib/dashboard/products";
import { appColor } from "@/lib/dashboard/colors";
import { blobUrl, DEV_SOURCES, loadDevSection } from "@/lib/dashboard/development";
import { requireSession } from "@/lib/dashboard/session";

export const dynamic = "force-dynamic";

export default async function AppDevelopmentPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireSession();
  const { slug } = await params;
  const startups = await dashProducts();
  const startup = startups.find((s) => s.slug === slug);
  if (!startup || !DEV_SOURCES[slug]) notFound();
  const [s, history] = await Promise.all([
    loadDevSection(slug),
    getProductHistory(slug).catch((e: unknown) => {
      console.error(`[development] ${slug} history unavailable:`, e instanceof Error ? e.message : e);
      return null;
    }),
  ]);
  if (!s) notFound();
  const end = today();
  const snaps = history?.map((h) => h.snapshot) ?? [];
  const doneSeries = dailySeries(snaps, [slug], (x) => x.done, end);
  const scopeSeries = dailySeries(snaps, [slug], activeOf, end);
  const weekAgo = addDays(end, -7);
  const latest = history?.[history.length - 1] ?? null;
  const before = history ? asOf(history, weekAgo) : null;
  const moves = latest ? moduleMoves(latest.rows, before?.rows ?? null) : [];
  const moved = moves.filter((m) => m.doneThen === null || m.doneNow !== m.doneThen).sort((a, b) => b.doneNow - (b.doneThen ?? 0) - (a.doneNow - (a.doneThen ?? 0)));
  const apps = startups.map((a) => ({ slug: a.slug, name: a.name, color: appColor(a.slug) }));
  const color = appColor(slug);

  return (
    <div className="grid grid-cols-1 gap-8">
      <header className="dash-rise">
        <p className="dash-eyebrow">Development</p>
        <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          <span className="size-3 rounded-full" style={{ background: color }} aria-hidden />
          {startup.name}
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--d-ink-3)" }}>
          {updatedLabel(s)} · read live from the product&rsquo;s own progress files{s.live ? "" : " (numbers from the last snapshot: the live file couldn't be read)"}
        </p>
      </header>
      <DevTabs apps={apps} current={slug} />

      <section className="dash-card grid grid-cols-1 gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="grid content-start gap-4">
          <p className="text-5xl font-semibold tabular-nums" style={{ color: "#fff" }}>
            {s.totals ? s.totals.activeCompletionPct : "—"}
            <span className="text-2xl" style={{ color: "#8c8b84" }}>% built</span>
          </p>
          <DevBar s={s} color={color} />
          <DevStats s={s} />
          <p className="text-xs leading-relaxed" style={{ color: "#8c8b84" }}>
            Completion counts done stories against everything not set aside (deferred or superseded work is left out), rounded down.
          </p>
        </div>
        <DevFacts s={s} />
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card title="Done and in scope over time" hint="In scope is every story not set aside. The gap between the lines is what is left; it widens when scope is added.">
          {doneSeries.days.length ? (
            <TimeChart
              days={doneSeries.days}
              series={[
                { name: "Done", color, values: doneSeries.values[slug] ?? [] },
                { name: "In scope", color: "#8c8b84", values: scopeSeries.values[slug] ?? [] },
              ]}
              format="int"
              kind="area"
              label={`${slug}-done-and-scope`}
              height={240}
            />
          ) : (
            <Empty>No recorded history yet.</Empty>
          )}
        </Card>
        <Card
          title="Moved in the last 7 days"
          hint={latest && before ? `Done stories per row on ${shortDay(latest.snapshot.captured_on)} against ${shortDay(weekAgo)}.` : "Nothing was recorded a week ago, so every row counts as new."}
        >
          {!latest ? (
            <Empty>No recorded history yet.</Empty>
          ) : moved.length === 0 ? (
            <Empty>No module moved in the last 7 days.</Empty>
          ) : (
            <ul className="grid gap-2 text-sm">
              {moved.slice(0, 10).map((m) => (
                <li key={m.id} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate" style={{ color: "#c3c2b7" }} title={m.name}>{m.name}</span>
                  <span className="shrink-0 tabular-nums" style={{ color: "#fff" }}>
                    {m.doneThen === null ? "new" : `${m.doneNow - m.doneThen >= 0 ? "+" : "−"}${Math.abs(m.doneNow - m.doneThen)}`}
                    <span style={{ color: "#8c8b84" }}> · {m.doneNow} of {m.activeNow}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {s.docs.map(({ doc, markdown, error }, i) => (
        <section key={doc.path} className="dash-card p-5 sm:p-6">
          <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: "#fff" }}>{doc.label}</h2>
              <p className="mt-0.5 text-xs" style={{ color: "#8c8b84" }}>
                <code>{doc.repo}/{doc.path}</code>
              </p>
            </div>
            <a href={blobUrl(doc)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors hover:bg-white/10" style={{ color: "#c3c2b7" }}>
              Open on GitHub <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </header>
          {markdown ? (
            <DevMarkdown markdown={markdown} base={blobUrl(doc)} openSections={i === 0 ? 3 : 0} />
          ) : (
            <p className="text-sm" style={{ color: "#c3c2b7" }}>
              This file couldn&rsquo;t be read just now ({error}). It will be tried again on the next visit.
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
