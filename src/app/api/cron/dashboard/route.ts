import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { noStore } from "@/lib/dashboard/request-guards";
import { collectAndStore } from "@/lib/dashboard/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * Vercel Cron calls this daily (vercel.json), before the newsletters, with
 * `Authorization: Bearer $CRON_SECRET`. It collects every dashboard period for every product
 * and stores them as today's numbers; pages and newsletters read only what is stored.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16 || !process.env.PROGRESS_WRITE_KEY) {
    console.error("[dashboard] CRON_SECRET or PROGRESS_WRITE_KEY is missing; refusing to run.");
    return NextResponse.json({ ok: false, error: "Not configured." }, { status: 503, headers: noStore });
  }
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!same(given, secret)) return NextResponse.json({ ok: false }, { status: 401, headers: noStore });

  const r = await collectAndStore();
  console.log(`[dashboard] daily collection: stored ${r.stored} rows in ${r.ms} ms; ${r.products.map((p) => `${p.slug}=${p.status}`).join(", ")}`);
  return NextResponse.json({ ok: r.ok, stored: r.stored, ms: r.ms, products: r.products, error: r.storeError }, { status: r.ok ? 200 : 502, headers: noStore });
}
