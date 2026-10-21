"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { ApplicationStatus } from "@/lib/careers/wonderjobs";

const NOT_FOUND = "We couldn't find that application. Use the link in your email.";

type State =
  | { s: "loading" }
  | { s: "ok"; app: ApplicationStatus; note?: string }
  | { s: "not_found" }
  | { s: "error"; message: string };

const day = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

export function StatusView() {
  const token = useSearchParams().get("t")?.trim() ?? "";
  const [state, setState] = useState<State>(token ? { s: "loading" } : { s: "not_found" });
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  // The token goes in the body of a request to this site, never into a URL that is fetched.
  const ask = useCallback(
    async (action: "view" | "withdraw"): Promise<State> => {
      try {
        const res = await fetch("/api/careers/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, action }), cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as { ok?: boolean; application?: ApplicationStatus; notFound?: boolean; error?: string };
        if (res.ok && json.application) return { s: "ok", app: json.application };
        if (res.status === 404 || json.notFound) return { s: "not_found" };
        return { s: "error", message: json.error ?? "Application status is unavailable right now. Please try again later." };
      } catch {
        return { s: "error", message: "We couldn't reach the server. Please check your connection and try again." };
      }
    },
    [token],
  );

  useEffect(() => {
    if (token) void ask("view").then(setState);
  }, [token, ask]);

  async function withdraw() {
    setBusy(true);
    const next = await ask("withdraw");
    setBusy(false);
    setConfirming(false);
    setState(next.s === "ok" ? { ...next, note: "Your application has been withdrawn." } : next);
  }

  if (state.s === "loading")
    return (
      <p className="mt-10 flex items-center gap-2 text-fg-muted" role="status">
        <Loader2 className="size-4 animate-spin" aria-hidden /> Loading your application…
      </p>
    );
  if (state.s === "not_found")
    return (
      <div className="card mt-10 p-8" role="status">
        <p className="title text-xl">{NOT_FOUND}</p>
      </div>
    );
  if (state.s === "error")
    return (
      <div className="card mt-10 p-8" role="alert">
        <p className="text-fg-muted">{state.message}</p>
        <button type="button" onClick={() => (setState({ s: "loading" }), ask("view").then(setState))} className="mt-4 text-sm font-medium text-accent underline-offset-4 hover:underline">
          Try again
        </button>
      </div>
    );

  const { app } = state;
  return (
    <div className="card mt-10 p-6 sm:p-8">
      {state.note ? (
        <p role="status" className="mb-5 rounded-xl bg-accent-soft px-4 py-3 text-sm">
          {state.note}
        </p>
      ) : null}
      <dl className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <dt className="text-sm text-fg-subtle">Position</dt>
          <dd className="title mt-1 text-xl break-words">
            {app.jobTitle}
            {app.company ? <span className="text-fg-muted"> · {app.company}</span> : null}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-fg-subtle">Status</dt>
          <dd className="mt-1 font-semibold">{app.statusLabel}</dd>
        </div>
        <div>
          <dt className="text-sm text-fg-subtle">Applied</dt>
          <dd className="mt-1">{day(app.appliedAt)}</dd>
        </div>
        <div>
          <dt className="text-sm text-fg-subtle">Last update</dt>
          <dd className="mt-1">{day(app.updatedAt)}</dd>
        </div>
      </dl>
      {app.canWithdraw ? (
        <div className="mt-8 border-t border-line pt-6">
          {confirming ? (
            <div role="group" aria-label="Confirm withdrawal">
              <p className="text-sm">Withdraw your application? The hiring team will stop considering it. This can&apos;t be undone.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" onClick={withdraw} disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-full bg-fg px-5 text-sm font-medium text-bg disabled:opacity-60">
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} Yes, withdraw
                </button>
                <button type="button" onClick={() => setConfirming(false)} disabled={busy} className="inline-flex h-11 items-center rounded-full border border-line px-5 text-sm font-medium">
                  Keep my application
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="inline-flex h-11 items-center rounded-full border border-line px-5 text-sm font-medium">
              Withdraw application
            </button>
          )}
        </div>
      ) : null}
      <p className="mt-8 text-sm text-fg-subtle">
        <Link href="/careers" className="underline underline-offset-2">
          See other open positions
        </Link>
      </p>
    </div>
  );
}
