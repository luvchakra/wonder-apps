"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { startups } from "@/content/startups";

type Status = { state: "idle" } | { state: "sending" } | { state: "sent" } | { state: "error"; message: string; field?: string };

const field =
  "w-full rounded-xl border border-line bg-card px-4 py-3 text-[15px] text-fg placeholder:text-fg-subtle transition-shadow focus:border-transparent focus:shadow-[0_0_0_3px_var(--accent)] focus:outline-none";
const label = "block text-sm font-medium text-fg-muted mb-1.5";

export function ContactForm({ defaultInterest }: { defaultInterest?: string }) {
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [interests, setInterests] = useState<string[]>(defaultInterest ? [defaultInterest] : []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setStatus({ state: "sending" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          organisation: fd.get("organisation"),
          role: fd.get("role"),
          interests,
          message: fd.get("message"),
          website: fd.get("website"),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; field?: string };
      if (res.ok && json.ok) {
        setStatus({ state: "sent" });
        form.reset();
        setInterests([]);
      } else {
        setStatus({ state: "error", message: json.error ?? "Something went wrong. Please try again.", field: json.field });
      }
    } catch {
      setStatus({ state: "error", message: "Network error. Please check your connection and try again." });
    }
  }

  function toggle(slug: string) {
    setInterests((cur) => (cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug]));
  }

  return (
    <div className="card relative overflow-hidden p-6 sm:p-8">
      <AnimatePresence mode="wait">
        {status.state === "sent" ? (
          <motion.div key="sent" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="py-10 text-center">
            <CheckCircle2 className="mx-auto size-12 text-accent" />
            <h3 className="title mt-4 text-2xl">Thank you — it&apos;s in the founder&apos;s inbox.</h3>
            <p className="mt-2 text-fg-muted">Expect a personal reply within two working days.</p>
            <button type="button" onClick={() => setStatus({ state: "idle" })} className="mt-6 text-sm font-medium text-accent underline-offset-4 hover:underline">
              Send another message
            </button>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={onSubmit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-5" noValidate>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className={label}>
                  Name
                </label>
                <input id="name" name="name" required minLength={2} autoComplete="name" className={field} placeholder="Your name" aria-invalid={status.state === "error" && status.field === "name"} />
              </div>
              <div>
                <label htmlFor="email" className={label}>
                  Email
                </label>
                <input id="email" name="email" type="email" required autoComplete="email" className={field} placeholder="you@fund.com" aria-invalid={status.state === "error" && status.field === "email"} />
              </div>
              <div>
                <label htmlFor="organisation" className={label}>
                  Fund or organisation <span className="text-fg-subtle">(optional)</span>
                </label>
                <input id="organisation" name="organisation" autoComplete="organization" className={field} placeholder="Firm name" />
              </div>
              <div>
                <label htmlFor="role" className={label}>
                  I am a…
                </label>
                <select id="role" name="role" defaultValue="investor" className={`${field} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2386868b%22 stroke-width=%222.5%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:12px] bg-[position:right_16px_center] bg-no-repeat pr-10`}>
                  <option value="investor">Investor</option>
                  <option value="partner">Strategic or distribution partner</option>
                  <option value="customer">Prospective customer / design partner</option>
                  <option value="press">Press</option>
                  <option value="other">Something else</option>
                </select>
              </div>
            </div>

            <fieldset>
              <legend className={label}>Interested in</legend>
              <div className="flex flex-wrap gap-2">
                {startups.map((s) => {
                  const on = interests.includes(s.slug);
                  return (
                    <button
                      key={s.slug}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(s.slug)}
                      className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${on ? "border-transparent text-white" : "border-line text-fg-muted hover:text-fg"}`}
                      style={on ? { background: s.accent } : undefined}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <label htmlFor="message" className={label}>
                Message
              </label>
              <textarea id="message" name="message" required minLength={10} rows={5} className={`${field} resize-y`} placeholder="What you invest in, what caught your eye, and how you'd like to proceed." aria-invalid={status.state === "error" && status.field === "message"} />
            </div>

            {/* Honeypot — hidden from people, irresistible to bots. */}
            <div className="absolute -left-[9999px] top-0" aria-hidden>
              <label htmlFor="website">Website</label>
              <input id="website" name="website" tabIndex={-1} autoComplete="off" />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-relaxed text-fg-subtle">
                Sent by email to the founder. No mailing list, no database — see the{" "}
                <Link href="/privacy" className="underline underline-offset-2">
                  privacy policy
                </Link>
                .
              </p>
              <button
                type="submit"
                disabled={status.state === "sending"}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-fg px-6 font-medium text-bg transition-opacity hover:opacity-85 disabled:opacity-60"
              >
                {status.state === "sending" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                {status.state === "sending" ? "Sending…" : "Send message"}
              </button>
            </div>

            {status.state === "error" ? (
              <p role="alert" className="rounded-xl bg-[oklch(0.62_0.22_25/0.12)] px-4 py-3 text-sm text-[oklch(0.5_0.2_25)]">
                {status.message}
              </p>
            ) : null}
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
