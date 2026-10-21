import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CareersShell, JobFacts, Notice, Skills } from "@/components/careers/parts";
import { resolveKey } from "@/lib/careers/key";
import { CareersError, listJobs, type Job } from "@/lib/careers/wonderjobs";
import { getSession } from "@/lib/dashboard/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Careers",
  description: "Open positions at WonderApps. Apply online; you'll get an email with a link to follow your application.",
  alternates: { canonical: "/careers" },
};

export default async function CareersPage() {
  let jobs: Job[] | null = null;
  let problem: "not_configured" | "unavailable" | null = null;
  try {
    jobs = (await listJobs()).jobs;
  } catch (e) {
    problem = e instanceof CareersError && e.kind === "not_configured" ? "not_configured" : "unavailable";
  }
  // The reason is for signed-in admins only; visitors see a plain message.
  const admin = problem ? await getSession().catch(() => null) : null;
  const reason = admin && problem === "not_configured" ? await resolveKey().then((r) => ("reason" in r ? r.reason : null)) : null;

  return (
    <CareersShell>
      <p className="eyebrow text-accent">Careers</p>
      <h1 className="display balance mt-4 text-[clamp(2.5rem,6vw,4.5rem)]">Work with us.</h1>
      <p className="lede mt-6 max-w-2xl text-lg text-fg-muted">Open positions across the portfolio. Apply online and you&apos;ll get an email with a link to follow your application.</p>

      {problem === "not_configured" ? (
        <Notice title="Careers isn't set up yet">
          <p>Please check back soon.</p>
          {admin ? (
            <p className="mt-3 text-sm">
              Admin: {reason ?? "No career-site key is available."}{" "}
              <Link href="/dashboard/careers" className="underline underline-offset-2">
                Set it up
              </Link>
            </p>
          ) : null}
        </Notice>
      ) : problem === "unavailable" ? (
        <Notice title="Careers is unavailable right now" action={{ href: "/careers", label: "Try again" }}>
          <p>We couldn&apos;t load the open positions. Please try again later.</p>
          {admin ? <p className="mt-3 text-sm">Admin: use Test connection on the dashboard&apos;s Careers page to see why.</p> : null}
        </Notice>
      ) : !jobs?.length ? (
        <Notice title="No open positions right now">
          <p>New roles appear here as soon as they open.</p>
        </Notice>
      ) : (
        <ul className="mt-12 grid gap-4" aria-label="Open positions">
          {jobs.map((j) => (
            <li key={j.id}>
              <Link href={`/careers/${encodeURIComponent(j.id)}`} className="card group block p-6 transition-shadow hover:shadow-lg focus-visible:shadow-lg sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="title text-xl break-words sm:text-2xl">{j.title}</h2>
                    {j.company ? <p className="mt-1 text-sm text-fg-subtle">{j.company}</p> : null}
                    <div className="mt-3">
                      <JobFacts job={j} />
                    </div>
                  </div>
                  <ArrowRight aria-hidden className="mt-1 size-5 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-1" />
                </div>
                <div className="mt-4">
                  <Skills skills={j.skills} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </CareersShell>
  );
}
