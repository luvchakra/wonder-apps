import { NextResponse } from "next/server";
import { clientIp, limited, sameOrigin } from "@/lib/dashboard/request-guards";
import { applicationSchema } from "@/lib/careers/validate";
import { applyToJob, CareersError } from "@/lib/careers/wonderjobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => NextResponse.json(body, { status, headers: { ...noStore, ...headers } });

/**
 * The apply form posts here; this forwards to WonderJobs. Nothing is stored and the body is never
 * logged: the client logs only the job id, the status code and the time taken.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ ok: false, error: "Please apply from the careers page." }, 403);
  const ip = clientIp(req);
  if (limited(`careers-apply:${ip}`, 10, 60 * 60_000)) {
    console.warn("[careers] apply rate limit hit");
    return json({ ok: false, error: "Too many applications from your network in the last hour. Please try again later." }, 429, { "Retry-After": "3600" });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Malformed request." }, 400);
  }
  const parsed = applicationSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return json({ ok: false, error: first?.message ?? "Please check the form.", field: first?.path?.[0] }, 400);
  }
  const { jobId, website, consent, ...rest } = parsed.data;
  // A filled honeypot is a bot: pretend it worked and send nothing.
  if (website) return json({ ok: true });

  const input = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== "" && v !== undefined)) as typeof rest;
  try {
    await applyToJob(jobId, { ...input, resumeUrl: rest.resumeUrl, name: rest.name, email: rest.email, consent });
    return json({ ok: true });
  } catch (e) {
    if (e instanceof CareersError) {
      if (e.kind === "bad_input" || e.kind === "conflict") return json({ ok: false, error: e.message }, e.status ?? 400);
      if (e.kind === "not_found") return json({ ok: false, closed: true, error: e.message }, 404);
      if (e.kind === "busy") return json({ ok: false, error: e.message }, 429, { "Retry-After": String(e.retryAfter ?? 30) });
    }
    return json({ ok: false, error: "We couldn't send your application just now. Please try again in a few minutes." }, 502);
  }
}
