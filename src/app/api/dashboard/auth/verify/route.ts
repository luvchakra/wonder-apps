import { NextResponse } from "next/server";
import { cookieNames, dashboardConfig, SESSION_TTL_S } from "@/lib/dashboard/config";
import { clientIp, limited, noStore } from "@/lib/dashboard/request-guards";
import { hashNonce, makeSessionToken, verifyToken } from "@/lib/dashboard/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const back = (req: Request, reason: string) => {
  const res = NextResponse.redirect(new URL(`/dashboard/login?e=${reason}`, dashboardConfig.origin()), 303);
  res.headers.set("Cache-Control", noStore["Cache-Control"]);
  res.headers.set("Referrer-Policy", "no-referrer");
  void req;
  return res;
};

/**
 * Completes sign-in. The link must be valid, unexpired, for an address that is
 * still allowed, and opened in the browser that asked for it (the challenge cookie
 * must hash to the value inside the signed link).
 */
export async function GET(req: Request) {
  if (limited(`verify:ip:${clientIp(req)}`, 20, 15 * 60_000)) return back(req, "slow");
  const url = new URL(req.url);
  const claims = verifyToken("login", url.searchParams.get("t"));
  if (!claims || typeof claims.sub !== "string") return back(req, "expired");

  const cookie = req.headers.get("cookie") ?? "";
  const name = cookieNames().challenge;
  const nonce = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  if (!nonce || hashNonce(nonce) !== claims.nh) return back(req, "browser");
  if (!dashboardConfig.isAllowed(claims.sub)) return back(req, "denied");

  const session = makeSessionToken(claims.sub);
  if (!session) return back(req, "config");

  const res = NextResponse.redirect(new URL("/dashboard", dashboardConfig.origin()), 303);
  res.cookies.set(cookieNames().session, session, { httpOnly: true, secure: dashboardConfig.isProd(), sameSite: "lax", path: "/", maxAge: SESSION_TTL_S });
  res.cookies.set(cookieNames().challenge, "", { httpOnly: true, secure: dashboardConfig.isProd(), sameSite: "lax", path: "/", maxAge: 0 });
  res.headers.set("Cache-Control", noStore["Cache-Control"]);
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}
