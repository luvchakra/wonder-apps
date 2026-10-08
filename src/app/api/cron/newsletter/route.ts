import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { dashboardConfig } from "@/lib/dashboard/config";
import { deliver } from "@/lib/dashboard/newsletter-run";
import { noStore } from "@/lib/dashboard/request-guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * Vercel Cron calls this on the schedule in vercel.json with `Authorization: Bearer $CRON_SECRET`.
 * `?cadence=weekly|monthly` picks which briefing; it only sends if that cadence is switched on
 * (NEWSLETTER_CADENCE) and there is a recipient list.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) {
    console.error("[newsletter] CRON_SECRET is missing or too short; refusing to run.");
    return NextResponse.json({ ok: false, error: "Not configured." }, { status: 503, headers: noStore });
  }
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!same(given, secret)) return NextResponse.json({ ok: false }, { status: 401, headers: noStore });

  const cadence = new URL(req.url).searchParams.get("cadence") === "monthly" ? "monthly" : "weekly";
  if (!dashboardConfig.cadence().has(cadence)) return NextResponse.json({ ok: true, skipped: `${cadence} newsletter is switched off` }, { headers: noStore });
  const to = dashboardConfig.recipients();
  if (!to.length) return NextResponse.json({ ok: false, error: "No recipients configured." }, { status: 503, headers: noStore });

  const { result, subject } = await deliver(cadence, to);
  if (!result.ok) {
    console.error("[newsletter] send failed:", result.reason);
    return NextResponse.json({ ok: false, error: "Send failed." }, { status: 502, headers: noStore });
  }
  return NextResponse.json({ ok: true, cadence, recipients: to.length, subject }, { headers: noStore });
}
