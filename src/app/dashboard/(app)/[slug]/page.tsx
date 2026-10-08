import { notFound } from "next/navigation";
import { AppHeader, AppView } from "@/components/dashboard/AppView";
import { RangeTabs } from "@/components/dashboard/RangeTabs";
import { startups } from "@/content/startups";
import { loadOne, parseRange } from "@/lib/dashboard/load";
import { appBySlug } from "@/lib/dashboard/registry";
import { requireSession } from "@/lib/dashboard/session";
import { windowLabel } from "@/lib/dashboard/window";

export const dynamic = "force-dynamic";

export default async function AppPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ range?: string; fresh?: string }> }) {
  await requireSession();
  const { slug } = await params;
  const sp = await searchParams;
  const startup = startups.find((s) => s.slug === slug);
  if (!startup || !appBySlug(slug)) notFound();
  const { key, window: w } = parseRange(sp.range);
  const data = await loadOne(slug, w, sp.fresh === "1");
  if (!data) notFound();
  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <AppHeader app={data.app} name={startup.name} snap={data.snap} tagline={startup.oneLiner} />
        <RangeTabs base={`/dashboard/${slug}`} current={key} stamp={`${windowLabel(w)} · ${w.tz.replace("_", " ")}`} />
      </div>
      <AppView app={data.app} snap={data.snap} w={w} />
    </div>
  );
}
