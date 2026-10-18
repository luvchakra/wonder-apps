import { notFound } from "next/navigation";
import { AppHeader, AppView } from "@/components/dashboard/AppView";
import { RangeTabs } from "@/components/dashboard/RangeTabs";
import { dashProducts } from "@/lib/dashboard/products";
import { loadOne, parseRange } from "@/lib/dashboard/load";
import { appBySlug } from "@/lib/dashboard/registry";
import { requireSession } from "@/lib/dashboard/session";
import { windowLabel } from "@/lib/dashboard/window";
import { asOfLabel, NoStoredData } from "@/components/dashboard/StoreNotice";
import { AppHistory } from "@/components/dashboard/History";
import { appColor } from "@/lib/dashboard/colors";
import { readStatHistory } from "@/lib/dashboard/store";

export const dynamic = "force-dynamic";

export default async function AppPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ range?: string }> }) {
  await requireSession();
  const { slug } = await params;
  const sp = await searchParams;
  const startup = (await dashProducts()).find((s) => s.slug === slug);
  if (!startup || !appBySlug(slug)) notFound();
  const { key } = parseRange(sp.range);
  const [data, history] = await Promise.all([loadOne(slug, key), readStatHistory()]);
  if (!data) notFound();
  const { w } = data.d;
  if (!data.snap)
    return (
      <div className="grid grid-cols-1 gap-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{startup.name}</h1>
          <RangeTabs base={`/dashboard/${slug}`} current={key} stamp={windowLabel(w)} />
        </div>
        <NoStoredData state={data.d.state === "ok" ? "empty" : data.d.state} error={data.d.error} />
      </div>
    );
  const snap = data.snap;
  return (
    <div className="grid grid-cols-1 gap-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <AppHeader app={data.app} name={startup.name} snap={snap} tagline={startup.oneLiner ?? ""} />
        <RangeTabs base={`/dashboard/${slug}`} current={key} stamp={`${windowLabel(w)} · as of ${asOfLabel(snap.fetchedAt, w.tz)}`} />
      </div>
      <AppHistory h={history} app={data.app} color={appColor(slug)} />
      <AppView app={data.app} snap={snap} w={w} />
    </div>
  );
}
