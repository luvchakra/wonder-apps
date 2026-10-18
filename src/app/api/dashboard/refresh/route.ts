import { NextResponse } from "next/server";
import { clientIp, limited, noStore, sameOrigin } from "@/lib/dashboard/request-guards";
import { getSession } from "@/lib/dashboard/session";
import { collectAndStore } from "@/lib/dashboard/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** The dashboard's Refresh button: collect every period for every product now, store it as today's numbers. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401, headers: noStore });
  if (!sameOrigin(req)) return NextResponse.json({ ok: false }, { status: 403, headers: noStore });
  if (limited(`refresh:${session.email}:${clientIp(req)}`, 10, 60 * 60_000))
    return NextResponse.json({ ok: false, error: "That's a lot of refreshes. Try again in a few minutes." }, { status: 429, headers: noStore });

  const r = await collectAndStore();
  console.log(`[dashboard] refresh: stored ${r.stored} rows in ${r.ms} ms; ${r.products.map((p) => `${p.slug}=${p.status}`).join(", ")}`);
  return NextResponse.json(
    { ok: r.ok, stored: r.stored, ms: r.ms, products: r.products, error: r.storeError },
    { status: r.ok ? 200 : 502, headers: noStore },
  );
}
