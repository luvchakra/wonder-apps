"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowUpRight, ExternalLink, RefreshCw } from "lucide-react";
import { totalsFor, type ProductProgress } from "@/content/progress";
import type { TrackerRefreshResult } from "@/app/api/tracker/route";
import { PortfolioStackedBar, StatusBar, StatusLegend } from "./StatusBar";
import { RingCluster } from "./ProgressRing";
import { CompletionBars } from "./CompletionBars";
import { Reveal } from "./Reveal";
import { Stat } from "./Stats";
import { SectionHeading } from "./ui";

type Live = { state: "idle" | "loading" | "ok" | "error"; fetchedAt?: string; errors: Record<string, string> };

function StatusPill({ status }: { status: string }) {
  const style =
    status === "Done"
      ? { background: "color-mix(in oklab, var(--good) 18%, transparent)", color: "var(--good)" }
      : status === "Superseded"
        ? { background: "var(--set-aside)", color: "var(--fg-muted)" }
        : { background: "color-mix(in oklab, var(--warn) 22%, transparent)", color: "color-mix(in oklab, var(--warn) 60%, var(--fg))" };
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={style}>
      {status}
    </span>
  );
}

export function TrackerClient({ initial }: { initial: ProductProgress[] }) {
  const [products, setProducts] = useState(initial);
  const [live, setLive] = useState<Live>({ state: "idle", errors: {} });

  const refresh = useCallback(async () => {
    setLive((l) => ({ ...l, state: "loading" }));
    try {
      const res = await fetch("/api/tracker", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { fetchedAt: string; results: TrackerRefreshResult[] };
      const errors: Record<string, string> = {};
      setProducts((cur) =>
        cur.map((p) => {
          const r = json.results.find((x) => x.slug === p.slug);
          if (!r) return p;
          if (!r.ok) {
            errors[p.slug] = r.error;
            return p;
          }
          // Keep editorial notes from the curated snapshot where the row still exists.
          const rows = r.rows.map((row) => ({ ...row, note: row.note ?? p.rows.find((x) => x.id === row.id)?.note }));
          return { ...p, rows, lastUpdated: r.lastUpdated ?? p.lastUpdated, currentFocus: r.currentFocus ?? p.currentFocus };
        }),
      );
      setLive({ state: Object.keys(errors).length === json.results.length ? "error" : "ok", fetchedAt: json.fetchedAt, errors });
    } catch (err) {
      setLive((l) => ({ ...l, state: "error", errors: { all: err instanceof Error ? err.message : "Refresh failed" } }));
    }
  }, []);

  // Seed with live numbers once on load; the button re-syncs on demand.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const allRows = products.flatMap((p) => p.rows);
  const portfolio = totalsFor(allRows);
  const perProduct = products.map((p) => ({ p, t: totalsFor(p.rows) }));
  const loading = live.state === "loading";
  const fetchedLabel = live.fetchedAt ? new Date(live.fetchedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : null;

  return (
    <>
      {/* ---------- Header + live controls -------------------------------- */}
      <section className="theme-dark bg-bg text-fg">
        <div className="container pt-[calc(var(--nav-h)+4rem)] pb-16 sm:pt-[calc(var(--nav-h)+6rem)]">
          <Reveal className="max-w-3xl">
            <p className="eyebrow text-accent">Portfolio engineering tracker</p>
            <h1 className="display balance mt-4 text-[clamp(2.25rem,6vw,4rem)]">Verifiable, not aspirational.</h1>
            <p className="lede mt-6 text-lg text-fg-muted">
              Every number is read live from each product&apos;s own public engineering tracker on GitHub — not estimated,
              not rounded up. High level first, then every module and epic underneath, for anyone doing diligence.
            </p>
          </Reveal>

          <Reveal delay={0.05} className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[15px] font-medium text-black transition-transform hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Refreshing…" : "Refresh live data"}
            </button>
            <AnimatePresence mode="wait">
              {live.state === "ok" ? (
                <motion.span key="ok" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-2 text-sm text-fg-muted">
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--good)] opacity-60" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-[var(--good)]" />
                  </span>
                  Live from GitHub · {fetchedLabel}
                </motion.span>
              ) : live.state === "error" ? (
                <motion.span key="err" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-2 text-sm text-[var(--warn)]">
                  <AlertTriangle className="size-4" /> Couldn&apos;t reach GitHub — showing the last synced snapshot
                </motion.span>
              ) : live.state === "idle" ? (
                <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-fg-subtle">
                  Snapshot from {products[0]?.lastUpdated}
                </motion.span>
              ) : null}
            </AnimatePresence>
          </Reveal>

          <Reveal delay={0.1} className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Products live" value={String(products.length)} note="All four, all free to try today" />
            <Stat label="Tracked stories" value={String(portfolio.total)} note="Across every backlog, all four products" />
            <Stat label="Done" value={String(portfolio.done)} note={`${portfolio.partial} in progress · ${portfolio.setAside} set aside`} />
            <Stat label="Active completion" value={`${portfolio.activeCompletionPct}%`} note="Done ÷ (total − set-aside work)" accent="var(--good)" />
          </Reveal>

          <Reveal delay={0.15} className="mt-10">
            <p className="eyebrow mb-3 text-fg-subtle">The whole portfolio, one bar</p>
            <PortfolioStackedBar row={portfolio} />
            <StatusLegend className="mt-4" />
          </Reveal>
        </div>
      </section>

      {/* ---------- High level ------------------------------------------- */}
      <section className="theme-light section bg-bg text-fg" aria-labelledby="overview">
        <div className="container">
          <Reveal>
            <SectionHeading eyebrow="High level" title={<span id="overview">Four products, one glance.</span>} lede="Active completion per product: done stories over everything that is still in scope. Outer ring to inner follows the order below." />
          </Reveal>
          <div className="mt-12 grid items-center gap-12 lg:grid-cols-2">
            <Reveal className="flex justify-center">
              <RingCluster items={perProduct.map(({ p, t }) => ({ label: p.name, pct: t.activeCompletionPct, color: p.accent }))} />
            </Reveal>
            <Reveal delay={0.1}>
              <CompletionBars
                items={perProduct.map(({ p, t }) => ({ label: p.name, pct: t.activeCompletionPct, color: p.accent, detail: `${t.done} of ${t.total - t.setAside} active stories` }))}
              />
            </Reveal>
          </div>

          <ul className="mt-16 grid gap-4 md:grid-cols-2">
            {perProduct.map(({ p, t }, i) => (
              <Reveal as="li" key={p.slug} delay={i * 0.05}>
                <a href={`#${p.slug}`} className="card group block h-full p-6 transition-shadow hover:shadow-lg sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="flex items-center gap-2.5">
                        <span className="size-2.5 rounded-full" style={{ background: p.accent }} />
                        <span className="title text-xl">{p.name}</span>
                      </span>
                      <p className="mt-1.5 text-sm text-fg-muted">{p.stage}</p>
                    </div>
                    <p className="headline text-3xl tabular-nums" style={{ color: p.accent }}>
                      {t.activeCompletionPct}%
                    </p>
                  </div>
                  <StatusBar row={t} className="mt-5" height="h-2.5" />
                  <p className="mt-3 text-sm text-fg-muted">
                    <strong className="text-fg">{t.done}</strong> done · <strong className="text-fg">{t.partial}</strong> in progress ·{" "}
                    <strong className="text-fg">{t.notStarted}</strong> not started
                    {t.setAside ? (
                      <>
                        {" "}
                        · <strong className="text-fg">{t.setAside}</strong> set aside
                      </>
                    ) : null}{" "}
                    of {t.total}
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-fg-subtle">
                    Now: {p.currentFocus} · updated {p.lastUpdated}
                  </p>
                  {live.errors[p.slug] ? (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--warn)]">
                      <AlertTriangle className="size-3.5" /> Live refresh failed for this product; showing snapshot
                    </p>
                  ) : null}
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium" style={{ color: p.accent }}>
                    Every {p.rowLabel.toLowerCase()} <ArrowUpRight className="size-3.5" />
                  </span>
                </a>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- Low level -------------------------------------------- */}
      <section className="theme-dark section bg-bg text-fg" aria-labelledby="detail">
        <div className="container">
          <Reveal>
            <SectionHeading eyebrow="Low level" title={<span id="detail">Every module and epic, by product.</span>} lede="Read straight from each repository's own tracking document, linked under each table." />
          </Reveal>

          <div className="mt-12 space-y-16">
            {perProduct.map(({ p, t }) => (
              <div key={p.slug} id={p.slug} className="scroll-mt-[calc(var(--nav-h)+1rem)]">
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-line pb-4">
                  <h3 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
                    <span className="size-2.5 rounded-full" style={{ background: p.accent }} />
                    {p.name}
                    <span className="ml-2 text-base font-medium text-fg-muted">
                      {t.done}/{t.total - t.setAside} · {t.activeCompletionPct}%
                    </span>
                  </h3>
                  <Link href={`/startups/${p.slug}`} className="text-sm text-fg-muted underline-offset-4 hover:text-fg hover:underline">
                    Investor deep dive →
                  </Link>
                </div>
                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-fg-muted">{p.methodology}</p>

                <div className="mt-6 overflow-x-auto">
                  <table className="w-full min-w-[680px] border-collapse text-sm">
                    <thead>
                      <tr className="text-left text-fg-subtle">
                        <th className="w-10 py-2 pr-3 font-medium">#</th>
                        <th className="py-2 pr-3 font-medium">{p.rowLabel}</th>
                        <th className="w-40 py-2 pr-3 font-medium">Progress</th>
                        <th className="py-2 pr-3 text-right font-medium">Done</th>
                        <th className="py-2 pr-3 text-right font-medium">In prog.</th>
                        <th className="py-2 pr-3 text-right font-medium">Left</th>
                        <th className="py-2 pr-3 text-right font-medium">Total</th>
                        <th className="py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.rows.map((row) => (
                        <tr key={row.id} className="border-t border-line align-top">
                          <td className="py-3 pr-3 tabular-nums text-fg-subtle">{row.id}</td>
                          <td className="py-3 pr-3">
                            <p className="font-medium">{row.name}</p>
                            {row.note ? <p className="mt-1 text-xs leading-relaxed text-fg-muted">{row.note}</p> : null}
                          </td>
                          <td className="py-3 pr-3">
                            <StatusBar row={row} className="mt-1.5" />
                          </td>
                          <td className="py-3 pr-3 text-right tabular-nums">{row.done}</td>
                          <td className="py-3 pr-3 text-right tabular-nums text-fg-muted">{row.partial || "–"}</td>
                          <td className="py-3 pr-3 text-right tabular-nums text-fg-muted">
                            {row.notStarted || "–"}
                            {row.setAside ? <span className="block text-[10px] text-fg-subtle">+{row.setAside} aside</span> : null}
                          </td>
                          <td className="py-3 pr-3 text-right tabular-nums text-fg-subtle">{row.total}</td>
                          <td className="py-3 whitespace-nowrap">
                            <StatusPill status={row.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-line font-medium">
                        <td className="py-3 pr-3" colSpan={2}>
                          Total
                        </td>
                        <td className="py-3 pr-3">
                          <StatusBar row={t} className="mt-1.5" />
                        </td>
                        <td className="py-3 pr-3 text-right tabular-nums">{t.done}</td>
                        <td className="py-3 pr-3 text-right tabular-nums text-fg-muted">{t.partial || "–"}</td>
                        <td className="py-3 pr-3 text-right tabular-nums text-fg-muted">{t.notStarted}{t.setAside ? <span className="block text-[10px] text-fg-subtle">+{t.setAside} aside</span> : null}</td>
                        <td className="py-3 pr-3 text-right tabular-nums text-fg-subtle">{t.total}</td>
                        <td className="py-3 text-fg-muted">{t.activeCompletionPct}%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <p className="mt-4 text-xs text-fg-subtle">
                  Source:{" "}
                  <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline-offset-2 hover:underline">
                    {p.sourceLabel} <ExternalLink className="size-3" />
                  </a>{" "}
                  · tracker last updated {p.lastUpdated}
                  {live.fetchedAt && !live.errors[p.slug] ? ` · fetched ${fetchedLabel}` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
