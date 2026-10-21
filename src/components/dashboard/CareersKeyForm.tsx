"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { KeyStatus } from "@/lib/careers/key";
import { Card } from "./parts";

type Test = { state: "connected"; jobs: number } | { state: "wrong_key" | "unavailable" | "not_configured" };

const btn = "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium disabled:opacity-50";
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const TEST_TEXT: Record<Test["state"], string> = {
  connected: "Connected",
  wrong_key: "Wrong key: WonderJobs refused it (401). Paste the key again or create a new one.",
  unavailable: "Unavailable: WonderJobs didn't answer. Try again in a minute.",
  not_configured: "No key to test yet.",
};

export function CareersKeyForm({ initial }: { initial: KeyStatus }) {
  const [status, setStatus] = useState(initial);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState<null | "save" | "clear" | "test">(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function post(body: object) {
    const res = await fetch("/api/dashboard/careers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { res, json: (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; status?: KeyStatus; test?: Test } };
  }

  async function act(action: "save" | "clear" | "test") {
    if (action === "clear" && !confirm("Clear the saved key? /careers stops working until a new key is saved (unless the environment fallback is set).")) return;
    setBusy(action);
    setMsg(null);
    try {
      const { json } = await post(action === "save" ? { action, key } : { action });
      if (action === "test" && json.test) {
        const t = json.test;
        setMsg({ ok: t.state === "connected", text: t.state === "connected" ? `Connected: ${t.jobs} open ${t.jobs === 1 ? "job" : "jobs"}.` : TEST_TEXT[t.state] });
      } else if (json.ok && json.status) {
        setStatus(json.status);
        setKey("");
        setMsg({ ok: true, text: action === "save" ? "Key saved." : "Key cleared." });
      } else setMsg({ ok: false, text: json.error ?? "That didn't work. Try again." });
    } catch {
      setMsg({ ok: false, text: "Network error. Try again." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
      <Card title="Career-site key" hint="Stored encrypted. After saving, only the last four characters are ever shown.">
        <dl className="grid gap-3 text-sm" style={{ color: "var(--d-ink-2)" }}>
          <div className="flex flex-wrap gap-x-3">
            <dt style={{ color: "var(--d-ink-3)" }}>Current key</dt>
            <dd className="font-mono" style={{ color: "#fff" }}>{status.mask ?? "None"}</dd>
          </div>
          {status.source ? (
            <div className="flex flex-wrap gap-x-3">
              <dt style={{ color: "var(--d-ink-3)" }}>From</dt>
              <dd>{status.source === "database" ? "Saved here" : "Environment fallback (WONDERJOBS_CAREERS_KEY)"}</dd>
            </div>
          ) : null}
          {status.updatedAt && status.updatedBy ? (
            <div className="flex flex-wrap gap-x-3">
              <dt style={{ color: "var(--d-ink-3)" }}>Last change</dt>
              <dd>
                {when(status.updatedAt)} by {status.updatedBy}
              </dd>
            </div>
          ) : null}
          {status.problem ? <p role="status">{status.problem}</p> : null}
        </dl>

        <form
          className="mt-6 grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void act("save");
          }}
        >
          <label htmlFor="careers-key" className="text-sm font-medium" style={{ color: "#fff" }}>
            {status.mask ? "Replace the key" : "Paste the key"}
          </label>
          <input
            id="careers-key"
            name="careers-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="wjcs_…"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="h-11 w-full rounded-xl border bg-transparent px-3 font-mono text-sm outline-none focus:ring-2"
            style={{ borderColor: "var(--d-line)", color: "#fff" }}
            aria-describedby="careers-key-hint"
          />
          <p id="careers-key-hint" className="text-xs" style={{ color: "var(--d-ink-3)" }}>
            {status.canSave ? "Starts with wjcs_. Saving replaces the current key straight away; no redeploy." : "Saving isn't available on this deployment (the database write key or the encryption secret isn't set)."}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={!status.canSave || !key.trim() || !!busy} className={btn} style={{ background: "#fff", color: "#0c0c0e" }}>
              {busy === "save" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} Save key
            </button>
            <button type="button" onClick={() => act("test")} disabled={!!busy} className={btn} style={{ border: "1px solid var(--d-line)", color: "#fff" }}>
              {busy === "test" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} Test connection
            </button>
            {status.source === "database" ? (
              <button type="button" onClick={() => act("clear")} disabled={!status.canSave || !!busy} className={btn} style={{ color: "var(--d-ink-2)" }}>
                {busy === "clear" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} Clear key
              </button>
            ) : null}
          </div>
          {msg ? (
            <p role={msg.ok ? "status" : "alert"} className="text-sm" style={{ color: msg.ok ? "#fff" : "#ff9a8a" }}>
              {msg.text}
            </p>
          ) : null}
        </form>
      </Card>

      <Card title="Changes" hint="Every save and clear: who, when, and the key's last four characters.">
        {status.audit.length ? (
          <ul className="grid gap-2 text-sm" style={{ color: "var(--d-ink-2)" }}>
            {status.audit.map((a, i) => (
              <li key={i}>
                <span style={{ color: "#fff" }}>{a.action === "save" ? `Saved …${a.last4 ?? ""}` : "Cleared"}</span> · {when(a.at)} · {a.actor}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm" style={{ color: "var(--d-ink-3)" }}>No changes yet.</p>
        )}
      </Card>
    </div>
  );
}
