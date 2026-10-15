import Link from "next/link";
import type { DevSection } from "@/lib/dashboard/development";

/** The app switcher at the top of every development page: one pill per product. */
export function DevTabs({ apps, current }: { apps: { slug: string; name: string; color: string }[]; current?: string }) {
  return (
    <nav aria-label="Applications" className="flex gap-1.5 overflow-x-auto pb-1">
      <Link
        href="/dashboard/development"
        aria-current={!current ? "page" : undefined}
        className="shrink-0 rounded-full px-3.5 py-2 text-sm"
        style={{ background: !current ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)", color: !current ? "#fff" : "#c3c2b7" }}
      >
        All apps
      </Link>
      {apps.map((a) => (
        <Link
          key={a.slug}
          href={`/dashboard/development/${a.slug}`}
          aria-current={current === a.slug ? "page" : undefined}
          className="flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm"
          style={{ background: current === a.slug ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)", color: current === a.slug ? "#fff" : "#c3c2b7" }}
        >
          <span className="size-2 rounded-full" style={{ background: a.color }} aria-hidden />
          {a.name}
        </Link>
      ))}
    </nav>
  );
}

/** Completion as a bar: the app's colour for done, a lighter step for partial, track for the rest. */
export function DevBar({ s, color }: { s: DevSection; color: string }) {
  if (!s.totals) return null;
  const active = Math.max(1, s.totals.total - s.totals.setAside);
  const done = (s.totals.done / active) * 100;
  const partial = (s.totals.partial / active) * 100;
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} aria-hidden>
      <span style={{ width: `${done}%`, background: color }} />
      <span style={{ width: `${partial}%`, background: `color-mix(in oklab, ${color} 45%, transparent)` }} />
    </div>
  );
}

export function DevStats({ s }: { s: DevSection }) {
  const t = s.totals;
  if (!t) return <p className="text-sm" style={{ color: "#8c8b84" }}>Numbers unavailable: neither the live file nor a recorded snapshot could be read.</p>;
  const active = t.total - t.setAside;
  const left = Math.max(0, active - t.done);
  return (
    <dl className="grid grid-cols-3 gap-3 text-sm">
      <div>
        <dt style={{ color: "#8c8b84" }}>Done</dt>
        <dd className="mt-0.5 font-semibold tabular-nums" style={{ color: "#fff" }}>
          {t.done} <span className="font-normal" style={{ color: "#8c8b84" }}>of {active}</span>
        </dd>
      </div>
      <div>
        <dt style={{ color: "#8c8b84" }}>Left</dt>
        <dd className="mt-0.5 font-semibold tabular-nums" style={{ color: "#fff" }}>
          {left}
          {t.partial ? <span className="font-normal" style={{ color: "#8c8b84" }}> · {t.partial} partial</span> : null}
        </dd>
      </div>
      <div>
        <dt style={{ color: "#8c8b84" }}>Set aside</dt>
        <dd className="mt-0.5 font-semibold tabular-nums" style={{ color: "#fff" }}>{t.setAside}</dd>
      </div>
    </dl>
  );
}

export function DevFacts({ s, limit }: { s: DevSection; limit?: number }) {
  const facts = [
    ...(s.currentFocus && !s.facts.some((f) => /current/i.test(f.label)) ? [{ label: "Current focus", value: s.currentFocus }] : []),
    ...s.facts,
  ].slice(0, limit ?? 99);
  if (!facts.length) return null;
  return (
    <dl className="grid gap-2.5 text-sm">
      {facts.map((f) => (
        <div key={f.label}>
          <dt className="text-xs" style={{ color: "#8c8b84" }}>{f.label}</dt>
          <dd className="mt-0.5 leading-snug" style={{ color: "#e7e6df" }}>{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function updatedLabel(s: DevSection) {
  return s.lastUpdated ? `Updated ${s.lastUpdated}` : "Update date not stated";
}
