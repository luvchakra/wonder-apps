"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

type Result = { ok: boolean; stored?: number; ms?: number; error?: string; products?: { slug: string; status: string }[] };

/** Collects every product's numbers now, stores them, then re-renders the page from the stored copy. */
export function RefreshButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function refresh() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/dashboard/refresh", { method: "POST", headers: { "content-type": "application/json" } });
      const r = (await res.json().catch(() => ({ ok: false, error: `Refresh failed (${res.status}).` }))) as Result;
      const missing = (r.products ?? []).filter((p) => p.status === "unreachable" || p.status === "not_configured").length;
      if (r.ok) {
        setMsg({ ok: true, text: `Collected and stored${r.ms ? ` in ${Math.round(r.ms / 1000)} s` : ""}${missing ? ` · ${missing} product${missing > 1 ? "s" : ""} not reachable` : ""}.` });
        startTransition(() => router.refresh());
      } else setMsg({ ok: false, text: r.error ?? `Refresh failed (${res.status}).` });
    } catch {
      setMsg({ ok: false, text: "Refresh failed: no answer from the server." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {msg ? (
        <p role="status" className="text-xs" style={{ color: msg.ok ? "#c3c2b7" : "#f2a0a0" }}>
          {msg.text}
        </p>
      ) : busy ? (
        <p role="status" className="text-xs" style={{ color: "#8c8b84" }}>Collecting from every product… this can take up to a minute.</p>
      ) : null}
      <button
        type="button"
        onClick={refresh}
        disabled={busy}
        className="inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors disabled:opacity-60"
        style={{ background: "rgba(255,255,255,0.09)", color: "#fff" }}
        title="Collect every product's numbers now and store them"
      >
        <RefreshCw className={`size-4 ${busy ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden />
        {busy ? "Refreshing…" : "Refresh"}
      </button>
    </div>
  );
}
