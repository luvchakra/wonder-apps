import { NextResponse } from "next/server";
import { z } from "zod";
import { dashboardConfig } from "@/lib/dashboard/config";
import { deliver, PERIODS } from "@/lib/dashboard/newsletter-run";
import { clientIp, limited, noStore, sameOrigin } from "@/lib/dashboard/request-guards";
import { getSession } from "@/lib/dashboard/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({ period: z.enum(PERIODS.map((p) => p.key) as [string, ...string[]]), mode: z.enum(["test", "all"]) });

/** Signed-in founder sends a briefing now: to themselves (test) or to the whole list. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401, headers: noStore });
  if (!sameOrigin(req)) return NextResponse.json({ ok: false }, { status: 403, headers: noStore });
  if (limited(`send:${session.email}:${clientIp(req)}`, 6, 60 * 60_000)) return NextResponse.json({ ok: false, error: "That's a lot of sends. Try again in an hour." }, { status: 429, headers: noStore });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400, headers: noStore });
  const { period, mode } = parsed.data;

  const to = mode === "test" ? [session.email] : dashboardConfig.recipients();
  if (!to.length) return NextResponse.json({ ok: false, error: "No recipients are configured (NEWSLETTER_RECIPIENTS)." }, { status: 400, headers: noStore });

  const { result, subject } = await deliver(period as never, to, { test: mode === "test" });
  if (!result.ok) {
    console.error("[newsletter] manual send failed:", result.reason);
    return NextResponse.json({ ok: false, error: result.reason.includes("RESEND_API_KEY") ? "Email isn't configured (RESEND_API_KEY)." : "The email service refused the send." }, { status: 502, headers: noStore });
  }
  return NextResponse.json({ ok: true, sent: to.length, subject }, { headers: noStore });
}
