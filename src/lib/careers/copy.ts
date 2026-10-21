/** Careers wording and formatting shared by the pages and their tests. No server-only code here. */

export function consentText(siteName: string, retentionMonths: number | null | undefined): string {
  const base = `I agree that ${siteName} stores my application to consider me for this and similar roles`;
  return typeof retentionMonths === "number" && retentionMonths > 0
    ? `${base}, and deletes it ${retentionMonths} ${retentionMonths === 1 ? "month" : "months"} after its last update.`
    : `${base}.`;
}

export const workModeLabel = (m: string) => ({ remote: "Remote", hybrid: "Hybrid", onsite: "On-site" })[m] ?? m;

export const jobTypeLabel = (t: string | null | undefined) =>
  t ? ({ full_time: "Full-time", part_time: "Part-time", contract: "Contract", internship: "Internship", temporary: "Temporary" }[t] ?? t.replace(/_/g, " ")) : null;

export function salaryRange(min?: number | null, max?: number | null, currency?: string | null): string | null {
  const fmt = (n: number) => {
    try {
      return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en", { style: "currency", currency: currency || "INR", maximumFractionDigits: 0 }).format(n);
    } catch {
      return `${currency ?? ""} ${n.toLocaleString("en")}`.trim();
    }
  };
  const lo = typeof min === "number" && min > 0 ? min : null;
  const hi = typeof max === "number" && max > 0 ? max : null;
  if (lo && hi) return lo === hi ? fmt(lo) : `${fmt(lo)} – ${fmt(hi)}`;
  if (lo) return `From ${fmt(lo)}`;
  if (hi) return `Up to ${fmt(hi)}`;
  return null;
}

/** schema.org employmentType for a WonderJobs jobType. */
export const employmentType = (t: string | null | undefined) => (t ? t.toUpperCase() : undefined);
