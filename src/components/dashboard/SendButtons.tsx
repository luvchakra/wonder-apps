"use client";

import { Send, UsersRound } from "lucide-react";
import { useState } from "react";

export function SendButtons({ period, recipientCount }: { period: string; recipientCount: number }) {
  const [busy, setBusy] = useState<"test" | "all" | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  async function send(mode: "test" | "all") {
    if (mode === "all" && !window.confirm(`Send this briefing to ${recipientCount} recipient${recipientCount === 1 ? "" : "s"} now?`)) return;
    setBusy(mode);
    setNote(null);
    try {
      const r = await fetch("/api/dashboard/newsletter/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ period, mode }) });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; sent?: number; error?: string };
      setNote(r.ok && j.ok ? { ok: true, text: mode === "test" ? "Sent to your inbox." : `Sent to ${j.sent} recipient${j.sent === 1 ? "" : "s"}.` } : { ok: false, text: j.error ?? "Couldn't send." });
    } catch {
      setNote({ ok: false, text: "Couldn't reach the server." });
    } finally {
      setBusy(null);
    }
  }

  const btn = "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-opacity disabled:opacity-50";
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" disabled={busy !== null} onClick={() => send("test")} className={btn} style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}>
        <Send className="size-4" /> {busy === "test" ? "Sending…" : "Send me a test"}
      </button>
      <button type="button" disabled={busy !== null || recipientCount === 0} onClick={() => send("all")} className={btn} style={{ background: "#fff", color: "#0c0c0e" }}>
        <UsersRound className="size-4" /> {busy === "all" ? "Sending…" : `Send to list (${recipientCount})`}
      </button>
      {note ? (
        <span role="status" className="text-sm" style={{ color: note.ok ? "#bfe8bf" : "#f1a3a3" }}>
          {note.text}
        </span>
      ) : null}
    </div>
  );
}
