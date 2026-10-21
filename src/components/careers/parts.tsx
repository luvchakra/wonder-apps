import Link from "next/link";
import type { Job } from "@/lib/careers/wonderjobs";
import { jobTypeLabel, salaryRange, workModeLabel } from "@/lib/careers/copy";

/** The page shell every careers page shares: a light band that follows the reader's theme. */
export function CareersShell({ children, narrow = false }: { children: React.ReactNode; narrow?: boolean }) {
  return (
    <section className="theme-light bg-bg-soft text-fg">
      <div className={`container pt-[calc(var(--nav-h)+3.5rem)] pb-24 ${narrow ? "max-w-3xl" : ""}`}>{children}</div>
    </section>
  );
}

export function JobFacts({ job }: { job: Job }) {
  const facts = [job.location, workModeLabel(job.workMode), jobTypeLabel(job.jobType), salaryRange(job.salaryMin, job.salaryMax, job.currency)].filter(Boolean) as string[];
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-fg-muted" aria-label="Job details">
      {facts.map((f, i) => (
        <li key={i} className="flex items-center gap-3">
          {i > 0 ? <span aria-hidden className="text-fg-subtle">·</span> : null}
          {f}
        </li>
      ))}
    </ul>
  );
}

export function Skills({ skills }: { skills: string[] }) {
  if (!skills?.length) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Skills">
      {skills.slice(0, 20).map((s) => (
        <li key={s} className="rounded-full border border-line px-3 py-1 text-xs text-fg-muted">
          {s}
        </li>
      ))}
    </ul>
  );
}

/** A plain message card for empty, unavailable and not-set-up states. */
export function Notice({ title, children, action }: { title: string; children?: React.ReactNode; action?: { href: string; label: string } }) {
  return (
    <div className="card mt-10 p-8 text-center sm:p-12" role="status">
      <h2 className="title text-2xl">{title}</h2>
      {children ? <div className="mx-auto mt-3 max-w-xl text-fg-muted">{children}</div> : null}
      {action ? (
        <Link href={action.href} className="mt-6 inline-flex items-center rounded-full bg-fg px-5 py-2.5 text-sm font-medium text-bg transition-opacity hover:opacity-85">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

/** Untrusted plain text: rendered as text nodes only, paragraphs on blank lines, line breaks kept. */
export function PlainText({ text }: { text: string }) {
  const paras = (text ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className="grid gap-4 leading-relaxed text-fg-muted">
      {paras.map((p, i) => (
        <p key={i} className="whitespace-pre-line break-words">
          {p}
        </p>
      ))}
    </div>
  );
}
