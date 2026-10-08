"use client";

import { ArrowRight, MailCheck } from "lucide-react";
import { useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    try {
      const r = await fetch("/api/dashboard/auth/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (r.ok && j.ok) setState("sent");
      else {
        setState("error");
        setMsg(j.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setState("error");
      setMsg("Couldn't reach the server. Check your connection and try again.");
    }
  }

  if (state === "sent")
    return (
      <div className="text-center" role="status">
        <span className="mx-auto grid size-12 place-items-center rounded-full" style={{ background: "rgba(25,158,112,0.16)" }}>
          <MailCheck className="size-6" style={{ color: "#199e70" }} />
        </span>
        <h2 className="mt-5 text-xl font-semibold">Check your inbox</h2>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--d-ink-2)" }}>
          If that address has access, a sign-in link is on its way. Open it in <strong style={{ color: "#fff" }}>this browser</strong> within 10 minutes.
        </p>
      </div>
    );

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor="email" className="dash-eyebrow">Email</label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@wonderapps.biz"
        className="mt-2 h-12 w-full rounded-xl border bg-transparent px-4 text-[15px] outline-none transition-colors focus:border-white/40"
        style={{ borderColor: "rgba(255,255,255,0.16)", color: "#fff" }}
      />
      <button
        type="submit"
        disabled={state === "sending" || !email.includes("@")}
        className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold transition-opacity disabled:opacity-50"
        style={{ background: "#fff", color: "#0c0c0e" }}
      >
        {state === "sending" ? "Sending…" : "Email me a sign-in link"} <ArrowRight className="size-4" />
      </button>
      {state === "error" ? (
        <p role="alert" className="mt-3 text-sm" style={{ color: "#e66767" }}>
          {msg}
        </p>
      ) : null}
    </form>
  );
}
