import { NextResponse } from "next/server";
import { cookieNames, dashboardConfig } from "@/lib/dashboard/config";
import { noStore, sameOrigin } from "@/lib/dashboard/request-guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false }, { status: 403, headers: noStore });
  const res = NextResponse.redirect(new URL("/dashboard/login", dashboardConfig.origin()), 303);
  res.cookies.set(cookieNames().session, "", { httpOnly: true, secure: dashboardConfig.isProd(), sameSite: "lax", path: "/", maxAge: 0 });
  res.headers.set("Cache-Control", noStore["Cache-Control"]);
  return res;
}
