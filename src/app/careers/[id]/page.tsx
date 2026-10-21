import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { ArrowLeft } from "lucide-react";
import { ApplyForm } from "@/components/careers/ApplyForm";
import { ShareButton } from "@/components/careers/ShareButton";
import { CareersShell, JobFacts, Notice, PlainText, Skills } from "@/components/careers/parts";
import { site } from "@/content/site";
import { consentText, employmentType } from "@/lib/careers/copy";
import { CareersError, getJob } from "@/lib/careers/wonderjobs";

export const dynamic = "force-dynamic";

type Loaded = { state: "ok"; job: Awaited<ReturnType<typeof getJob>>["job"]; site: Awaited<ReturnType<typeof getJob>>["site"] } | { state: "closed" | "not_configured" | "unavailable" };

// One WonderJobs call per request, shared by the metadata and the page.
const load = cache(async (id: string): Promise<Loaded> => {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) return { state: "closed" };
  try {
    const r = await getJob(id);
    return { state: "ok", job: r.job, site: r.site };
  } catch (e) {
    if (e instanceof CareersError && (e.kind === "not_found" || e.kind === "bad_input")) return { state: "closed" };
    if (e instanceof CareersError && e.kind === "not_configured") return { state: "not_configured" };
    return { state: "unavailable" };
  }
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const r = await load(id);
  if (r.state !== "ok") return { title: "Careers", robots: { index: false } };
  return {
    title: `${r.job.title} · Careers`,
    description: r.job.description.replace(/\s+/g, " ").slice(0, 155),
    alternates: { canonical: `/careers/${encodeURIComponent(id)}` },
  };
}

/** schema.org JobPosting, serialised so no value can close the script element. */
function jobPostingLd(job: Extract<Loaded, { state: "ok" }>["job"], url: string) {
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    datePosted: job.updatedAt,
    hiringOrganization: { "@type": "Organization", name: job.company || site.name, sameAs: site.url },
    employmentType: employmentType(job.jobType),
    url,
    skills: job.skills?.join(", ") || undefined,
  };
  if (job.workMode === "remote") ld.jobLocationType = "TELECOMMUTE";
  if (job.location) ld.jobLocation = { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: job.location } };
  if (job.salaryMin || job.salaryMax)
    ld.baseSalary = { "@type": "MonetaryAmount", currency: job.currency || "INR", value: { "@type": "QuantitativeValue", minValue: job.salaryMin ?? undefined, maxValue: job.salaryMax ?? undefined, unitText: "YEAR" } };
  return JSON.stringify(ld).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await load(id);
  const back = (
    <Link href="/careers" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
      <ArrowLeft className="size-4" aria-hidden /> All open positions
    </Link>
  );
  if (r.state !== "ok")
    return (
      <CareersShell narrow>
        {back}
        {r.state === "closed" ? (
          <Notice title="This position is no longer open" action={{ href: "/careers", label: "See open positions" }} />
        ) : r.state === "not_configured" ? (
          <Notice title="Careers isn't set up yet">
            <p>Please check back soon.</p>
          </Notice>
        ) : (
          <Notice title="Careers is unavailable right now" action={{ href: `/careers/${encodeURIComponent(id)}`, label: "Try again" }}>
            <p>Please try again later.</p>
          </Notice>
        )}
      </CareersShell>
    );

  const { job } = r;
  const url = `${site.url}/careers/${encodeURIComponent(id)}`;
  return (
    <CareersShell narrow>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jobPostingLd(job, url) }} />
      {back}
      <header className="mt-6">
        {job.company ? <p className="eyebrow text-accent">{job.company}</p> : null}
        <h1 className="display balance mt-3 text-[clamp(2rem,5vw,3.5rem)] break-words">{job.title}</h1>
        <div className="mt-4">
          <JobFacts job={job} />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a href="#apply" className="inline-flex h-11 items-center rounded-full bg-fg px-5 text-sm font-medium text-bg transition-opacity hover:opacity-85">
            Apply
          </a>
          <ShareButton title={job.title} url={url} />
        </div>
      </header>

      <div className="mt-10">
        <h2 className="sr-only">About the role</h2>
        <PlainText text={job.description} />
      </div>
      {job.skills?.length ? (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold">Skills</h2>
          <Skills skills={job.skills} />
        </div>
      ) : null}

      <div id="apply" className="mt-14 scroll-mt-[calc(var(--nav-h)+1rem)]">
        <h2 className="title text-2xl">Apply</h2>
        <div className="mt-5">
          <ApplyForm jobId={job.id} consent={consentText(site.name, r.site?.retentionMonths)} />
        </div>
      </div>
    </CareersShell>
  );
}
