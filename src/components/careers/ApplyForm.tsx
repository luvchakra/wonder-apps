"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Send } from "lucide-react";

type Status = { state: "idle" } | { state: "sending" } | { state: "sent" } | { state: "closed" } | { state: "error"; message: string; field?: string };

const input =
  "w-full rounded-xl border border-line bg-card px-4 py-3 text-[15px] text-fg placeholder:text-fg-subtle transition-shadow focus:border-transparent focus:shadow-[0_0_0_3px_var(--accent)] focus:outline-none aria-[invalid=true]:border-[oklch(0.6_0.2_25)]";
const label = "mb-1.5 block text-sm font-medium text-fg-muted";

type FieldProps = { id: string; name: string; hint?: string; optional?: boolean; status: Status } & React.InputHTMLAttributes<HTMLInputElement>;

function Field({ id, name, hint, optional, status, ...rest }: FieldProps) {
  const err = status.state === "error" && status.field === id ? status.message : null;
  const describedBy = [hint ? `${id}-hint` : null, err ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className={label}>
        {name} {optional ? <span className="text-fg-subtle">(optional)</span> : null}
      </label>
      <input id={id} name={id} className={input} aria-invalid={!!err} aria-describedby={describedBy} required={!optional} {...rest} />
      {hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-fg-subtle">
          {hint}
        </p>
      ) : null}
      {err ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-[oklch(0.55_0.2_25)]">
          {err}
        </p>
      ) : null}
    </div>
  );
}

/** Posts to this site's own /api/careers/apply; the browser never calls WonderJobs. */
export function ApplyForm({ jobId, consent }: { jobId: string; consent: string }) {
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [noteLen, setNoteLen] = useState(0);
  // Move focus to the field the server rejected, so its error is read out with it.
  useEffect(() => {
    if (status.state === "error" && status.field) document.getElementById(status.field)?.focus();
  }, [status]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const s = (k: string) => String(fd.get(k) ?? "");
    setStatus({ state: "sending" });
    try {
      const res = await fetch("/api/careers/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          name: s("name"),
          email: s("email"),
          phone: s("phone"),
          location: s("location"),
          linkedinUrl: s("linkedinUrl"),
          resumeUrl: s("resumeUrl"),
          coverNote: s("coverNote"),
          consent: fd.get("consent") === "on",
          website: s("website"),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; field?: string; closed?: boolean };
      if (res.status === 200 && json.ok) {
        setStatus({ state: "sent" });
        form.reset();
      } else if (res.status === 404 || json.closed) setStatus({ state: "closed" });
      else if ((res.status === 400 || res.status === 409) && json.error) setStatus({ state: "error", message: json.error, field: json.field });
      else if (res.status === 429 && json.error) setStatus({ state: "error", message: json.error });
      else setStatus({ state: "error", message: "We couldn't send your application. Please try again in a few minutes." });
    } catch {
      setStatus({ state: "error", message: "We couldn't send your application. Please check your connection and try again." });
    }
  }

  if (status.state === "sent")
    return (
      <div className="card p-8 text-center" role="status">
        <CheckCircle2 className="mx-auto size-12 text-accent" aria-hidden />
        <p className="title mt-4 text-xl">Application sent. Check your email for a confirmation and a link to follow it.</p>
      </div>
    );
  if (status.state === "closed")
    return (
      <div className="card p-8 text-center" role="status">
        <p className="title text-xl">This position is no longer open</p>
        <Link href="/careers" className="mt-4 inline-block text-sm font-medium text-accent underline-offset-4 hover:underline">
          See open positions
        </Link>
      </div>
    );

  const consentErr = status.state === "error" && status.field === "consent" ? status.message : null;
  const noteErr = status.state === "error" && status.field === "coverNote" ? status.message : null;
  const general = status.state === "error" && !["name", "email", "phone", "location", "linkedinUrl", "resumeUrl", "coverNote", "consent"].includes(status.field ?? "") ? status.message : null;

  return (
    <form onSubmit={onSubmit} className="card relative grid gap-5 p-6 sm:p-8" noValidate aria-busy={status.state === "sending"}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" name="Full name" autoComplete="name" maxLength={120} status={status} />
        <Field id="email" name="Email" type="email" autoComplete="email" maxLength={200} status={status} />
        <Field id="phone" name="Phone" type="tel" autoComplete="tel" maxLength={40} optional status={status} />
        <Field id="location" name="Location" autoComplete="address-level2" maxLength={120} optional status={status} />
      </div>
      <Field id="linkedinUrl" name="LinkedIn or portfolio" type="url" inputMode="url" placeholder="https://" maxLength={500} optional status={status} />
      <Field
        id="resumeUrl"
        name="Résumé link"
        type="url"
        inputMode="url"
        placeholder="https://"
        maxLength={500}
        hint="A link that starts with https:// to your résumé on Google Drive, Dropbox, LinkedIn or your own site. Make sure anyone with the link can open it."
        status={status}
      />
      <div>
        <label htmlFor="coverNote" className={label}>
          Cover note <span className="text-fg-subtle">(optional)</span>
        </label>
        <textarea
          id="coverNote"
          name="coverNote"
          rows={5}
          maxLength={4000}
          onChange={(e) => setNoteLen(e.target.value.length)}
          className={`${input} resize-y`}
          aria-invalid={!!noteErr}
          aria-describedby={`coverNote-count${noteErr ? " coverNote-error" : ""}`}
        />
        <p id="coverNote-count" className="mt-1.5 text-right text-xs text-fg-subtle">
          {noteLen} / 4000
        </p>
        {noteErr ? (
          <p id="coverNote-error" className="text-sm text-[oklch(0.55_0.2_25)]">
            {noteErr}
          </p>
        ) : null}
      </div>

      <div>
        <div className="flex items-start gap-3">
          <input id="consent" name="consent" type="checkbox" required className="mt-1 size-4 shrink-0 accent-[var(--accent)]" aria-invalid={!!consentErr} aria-describedby={consentErr ? "consent-error" : undefined} />
          <label htmlFor="consent" className="text-sm leading-relaxed text-fg-muted">
            {consent}
          </label>
        </div>
        {consentErr ? (
          <p id="consent-error" className="mt-1.5 text-sm text-[oklch(0.55_0.2_25)]">
            {consentErr}
          </p>
        ) : null}
      </div>

      {/* Honeypot: hidden from people and assistive tech. */}
      <div className="absolute -left-[9999px] top-0" aria-hidden>
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-fg-subtle">
          Your application goes to the hiring team. See the{" "}
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
          {status.state === "sending" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
          {status.state === "sending" ? "Sending…" : "Send application"}
        </button>
      </div>

      {general ? (
        <p role="alert" className="rounded-xl bg-[oklch(0.62_0.22_25/0.12)] px-4 py-3 text-sm text-[oklch(0.5_0.2_25)]">
          {general}
        </p>
      ) : status.state === "error" ? (
        <p role="alert" className="sr-only">
          {status.message}
        </p>
      ) : null}
    </form>
  );
}
