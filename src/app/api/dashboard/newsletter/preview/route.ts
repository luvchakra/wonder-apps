import { NextResponse } from "next/server";
import { compose, parsePeriod } from "@/lib/dashboard/newsletter-run";
import { noStore } from "@/lib/dashboard/request-guards";
import { getSession } from "@/lib/dashboard/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The briefing as a standalone HTML file (`?download=1` saves it), for forwarding or archiving. */
export async function GET(req: Request) {
  if (!(await getSession())) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401, headers: noStore });
  const url = new URL(req.url);
  const period = parsePeriod(url.searchParams.get("period"));
  const { n, w } = await compose(period, false);
  const day = w.start.toISOString().slice(0, 10);
  return new NextResponse(n.html, {
    headers: {
      ...noStore,
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'none'; img-src 'self' https: data:; style-src 'unsafe-inline'; frame-ancestors 'self'",
      ...(url.searchParams.get("download") ? { "Content-Disposition": `attachment; filename="wonderapps-${period}-${day}.html"` } : {}),
    },
  });
}
