import "server-only";
import { resolveKey } from "./key";

/**
 * The only code that talks to WonderJobs (https://jobs.wonderapps.biz), which runs the careers
 * pipeline: jobs, applications, emails, decisions and deletion. WonderApps stores no applicant
 * data; it shows the jobs and forwards what an applicant submits.
 *
 * Every call carries the career-site key as a Bearer token from the server. The key never
 * appears in a returned error, a log line or a page. Logs carry only the path kind, the job id,
 * the status code and the time taken.
 */

export const DEFAULT_BASE_URL = "https://jobs.wonderapps.biz";
const TIMEOUT_MS = 8_000;
const LIST_TTL_MS = 60_000;

/** WONDERJOBS_BASE_URL may point at another *.wonderapps.biz host (tests, staging); anything else is ignored. */
export function baseUrl(override = process.env.WONDERJOBS_BASE_URL): string {
  if (!override) return DEFAULT_BASE_URL;
  try {
    const u = new URL(override);
    if (u.protocol === "https:" && /^[a-z0-9-]+(\.[a-z0-9-]+)*\.wonderapps\.biz$/.test(u.hostname) && !u.port && u.pathname === "/" && !u.search)
      return u.origin;
  } catch {
    /* fall through */
  }
  console.warn("[careers] WONDERJOBS_BASE_URL ignored: only https://*.wonderapps.biz is allowed");
  return DEFAULT_BASE_URL;
}

export type WorkMode = "remote" | "hybrid" | "onsite";
export type Job = {
  id: string;
  title: string;
  location: string;
  workMode: WorkMode;
  jobType?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string | null;
  description: string;
  skills: string[];
  company: string;
  updatedAt: string;
};
export type CareerSite = { name: string; retentionMonths: number | null };
export type ApplicationStatus = {
  status: "new" | "reviewing" | "interview" | "offer" | "hired" | "rejected" | "withdrawn";
  statusLabel: string;
  jobTitle: string;
  company: string;
  appliedAt: string;
  updatedAt: string;
  canWithdraw: boolean;
};
export type ApplicationInput = {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  resumeUrl: string;
  coverNote?: string;
  consent: true;
};

export type CareersErrorKind = "not_configured" | "bad_input" | "unauthorized" | "not_found" | "conflict" | "busy" | "unavailable";

/** A failure with a message that is safe to show people. It never contains the key. */
export class CareersError extends Error {
  constructor(
    readonly kind: CareersErrorKind,
    message: string,
    readonly status: number | null = null,
    readonly retryAfter: number | null = null,
  ) {
    super(message);
    this.name = "CareersError";
  }
}

const MESSAGES: Record<Exclude<CareersErrorKind, "bad_input" | "conflict">, string> = {
  not_configured: "Careers isn't set up yet.",
  unauthorized: "Careers isn't available right now.",
  not_found: "This position is no longer open.",
  busy: "We're busy right now. Please try again shortly.",
  unavailable: "Careers is unavailable right now. Please try again later.",
};

type Opts = { key: string; base: string; fetchImpl?: typeof fetch; label: string };

async function call<T>(method: "GET" | "POST", path: string, body: unknown, o: Opts): Promise<T> {
  const f = o.fetchImpl ?? fetch;
  const attempts = method === "GET" ? 2 : 1; // GETs retry once on a network error or 5xx; POSTs never.
  let last: CareersError = new CareersError("unavailable", MESSAGES.unavailable);
  for (let i = 0; i < attempts; i++) {
    const t0 = Date.now();
    let res: Response;
    try {
      res = await f(`${o.base}${path}`, {
        method,
        headers: { Authorization: `Bearer ${o.key}`, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (e) {
      const timeout = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
      console.warn(`[careers] ${o.label} ${timeout ? "timeout" : "network error"} ${Date.now() - t0}ms`);
      last = new CareersError("unavailable", MESSAGES.unavailable);
      continue;
    }
    console.log(`[careers] ${o.label} ${res.status} ${Date.now() - t0}ms`);
    if (res.ok) return (await res.json()) as T;
    const msg = await res
      .json()
      .then((j: { error?: unknown }) => (typeof j?.error === "string" ? j.error.slice(0, 300) : ""))
      .catch(() => "");
    if (res.status >= 500) {
      last = new CareersError("unavailable", MESSAGES.unavailable, res.status);
      continue;
    }
    if (res.status === 400) throw new CareersError("bad_input", msg || "Please check the form.", 400);
    if (res.status === 401) throw new CareersError("unauthorized", MESSAGES.unauthorized, 401);
    if (res.status === 404) throw new CareersError("not_found", MESSAGES.not_found, 404);
    if (res.status === 409) throw new CareersError("conflict", msg || "You've already applied for this position.", 409);
    if (res.status === 429) {
      const ra = Number.parseInt(res.headers.get("retry-after") ?? "", 10);
      throw new CareersError("busy", MESSAGES.busy, 429, Number.isFinite(ra) && ra > 0 ? Math.min(ra, 3600) : 30);
    }
    throw new CareersError("unavailable", MESSAGES.unavailable, res.status);
  }
  throw last;
}

/** A client bound to one key; exported for tests. Pages and routes use `careers()`. */
export function createClient(key: string, base = baseUrl(), fetchImpl?: typeof fetch) {
  const o = (label: string): Opts => ({ key, base, fetchImpl, label });
  const enc = encodeURIComponent;
  return {
    listJobs: () => call<{ site: CareerSite; jobs: Job[] }>("GET", "/api/careers/v1/jobs", null, o("jobs")),
    getJob: (id: string) => call<{ job: Job; site: CareerSite }>("GET", `/api/careers/v1/jobs/${enc(id)}`, null, o(`job ${id}`)),
    apply: (id: string, input: ApplicationInput) => call<{ ok: true; id: string }>("POST", `/api/careers/v1/jobs/${enc(id)}/applications`, input, o(`apply ${id}`)),
    // The token goes in the body, never in the URL, so it stays out of every log.
    status: (token: string, action: "view" | "withdraw") =>
      call<{ application: ApplicationStatus }>("POST", "/api/careers/v1/applications/status", { token, action }, o(`status ${action}`)),
  };
}

let listMemo: { at: number; key: string; value: { site: CareerSite; jobs: Job[] } } | null = null;

async function client() {
  const r = await resolveKey();
  if (!r.key) throw new CareersError("not_configured", MESSAGES.not_configured);
  return { c: createClient(r.key), key: r.key };
}

/** The job list, cached in memory for up to 60 s. Nothing else is cached. */
export async function listJobs() {
  const { c, key } = await client();
  if (listMemo && listMemo.key === key && Date.now() - listMemo.at < LIST_TTL_MS) return listMemo.value;
  const value = await c.listJobs();
  value.jobs = Array.isArray(value.jobs) ? value.jobs : [];
  listMemo = { at: Date.now(), key, value };
  return value;
}

export const getJob = async (id: string) => (await client()).c.getJob(id);
export const applyToJob = async (id: string, input: ApplicationInput) => (await client()).c.apply(id, input);
export const applicationStatus = async (token: string, action: "view" | "withdraw") => (await client()).c.status(token, action);

/** The admin's Test connection button: never uses the cache. */
export async function testConnection(): Promise<{ state: "connected"; jobs: number } | { state: "wrong_key" | "unavailable" | "not_configured" }> {
  try {
    const { c } = await client();
    const r = await c.listJobs();
    return { state: "connected", jobs: Array.isArray(r.jobs) ? r.jobs.length : 0 };
  } catch (e) {
    if (e instanceof CareersError && e.kind === "not_configured") return { state: "not_configured" };
    if (e instanceof CareersError && e.kind === "unauthorized") return { state: "wrong_key" };
    return { state: "unavailable" };
  }
}

export const forgetJobsMemo = () => {
  listMemo = null;
};
