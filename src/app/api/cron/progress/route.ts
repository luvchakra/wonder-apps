import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { recordAll } from "@/lib/progress/record";
import { noStore } from "@/lib/dashboard/request-guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * Vercel Cron calls this daily (vercel.json) with `Authorization: Bearer $CRON_SECRET`. It records
 * today's snapshot of every product's public tracker; PROGRESS_WRITE_KEY is the key the database's
 * record_progress_snapshot function checks. Pages that quote these numbers refresh right after.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const writeKey = process.env.PROGRESS_WRITE_KEY;
  if (!secret || secret.length < 16 || !writeKey) {
    console.error("[progress] CRON_SECRET or PROGRESS_WRITE_KEY is missing; refusing to run.");
    return NextResponse.json({ ok: false, error: "Not configured." }, { status: 503, headers: noStore });
  }
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!same(given, secret)) return NextResponse.json({ ok: false }, { status: 401, headers: noStore });

  const results = await recordAll(writeKey);
  for (const r of results) if (!r.ok) console.error(`[progress] ${r.slug}: ${r.error}`);
  if (results.some((r) => r.ok && r.snapshotId !== null)) revalidateTag("progress", "max");
  const ok = results.every((r) => r.ok);
  return NextResponse.json({ ok, results }, { status: ok ? 200 : 207, headers: noStore });
}
