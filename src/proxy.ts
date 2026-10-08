import { NextResponse, type NextRequest } from "next/server";
import { cookieNames } from "@/lib/dashboard/config";
import { sessionFromToken } from "@/lib/dashboard/tokens";

/**
 * First gate for the founder dashboard. Anything under /dashboard or /api/dashboard
 * needs a valid session cookie, except the sign-in page and the sign-in endpoints.
 * Pages and route handlers check the session again themselves (see session.ts), so a
 * proxy bypass would still not expose data.
 */
const PUBLIC = [/^\/dashboard\/login\/?$/, /^\/api\/dashboard\/auth\/(request|verify)\/?$/];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const headers = {
    "Cache-Control": "no-store, max-age=0",
    "X-Robots-Tag": "noindex, nofollow",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "same-origin",
    "X-Content-Type-Options": "nosniff",
  };

  if (!PUBLIC.some((re) => re.test(pathname))) {
    const ok = sessionFromToken(req.cookies.get(cookieNames().session)?.value);
    if (!ok) {
      if (pathname.startsWith("/api/")) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401, headers });
      return NextResponse.redirect(new URL("/dashboard/login", req.url), { headers });
    }
  }
  const res = NextResponse.next();
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}

export const config = { matcher: ["/dashboard/:path*", "/api/dashboard/:path*"] };
