import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { DevMarkdown } from "@/components/dashboard/DevMarkdown";
import { DevBar, DevFacts, DevStats, DevTabs, updatedLabel } from "@/components/dashboard/DevParts";
import { startups } from "@/content/startups";
import { appColor } from "@/lib/dashboard/colors";
import { blobUrl, DEV_SOURCES, loadDevSection } from "@/lib/dashboard/development";
import { requireSession } from "@/lib/dashboard/session";

export const dynamic = "force-dynamic";

export default async function AppDevelopmentPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireSession();
  const { slug } = await params;
  const startup = startups.find((s) => s.slug === slug);
  if (!startup || !DEV_SOURCES[slug]) notFound();
  const s = await loadDevSection(slug);
  if (!s) notFound();
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
            {s.totals.activeCompletionPct}
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
