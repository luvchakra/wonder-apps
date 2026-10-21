import { NextResponse } from "next/server";
import { clientIp, limited, sameOrigin } from "@/lib/dashboard/request-guards";
import { statusSchema } from "@/lib/careers/validate";
import { applicationStatus, CareersError } from "@/lib/careers/wonderjobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });
const NOT_FOUND = "We couldn't find that application. Use the link in your email.";

/** The status page posts the token here (in the body); this asks WonderJobs. Never cached, never logged. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ ok: false, error: "Please use the link in your email." }, 403);
  if (limited(`careers-status:${clientIp(req)}`, 60, 10 * 60_000)) {
    console.warn("[careers] status rate limit hit");
    return NextResponse.json({ ok: false, error: "Too many requests. Please try again shortly." }, { status: 429, headers: { ...headers, "Retry-After": "120" } });
  }
  const parsed = statusSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ ok: false, notFound: true, error: NOT_FOUND }, 404);
  try {
    const { application } = await applicationStatus(parsed.data.token, parsed.data.action);
    return json({ ok: true, application });
  } catch (e) {
    if (e instanceof CareersError) {
      if (e.kind === "not_found" || e.kind === "bad_input") return json({ ok: false, notFound: true, error: NOT_FOUND }, 404);
      if (e.kind === "conflict") return json({ ok: false, error: e.message }, 409);
      if (e.kind === "busy") return json({ ok: false, error: e.message }, 429);
    }
    return json({ ok: false, error: "Application status is unavailable right now. Please try again later." }, 502);
  }
}
