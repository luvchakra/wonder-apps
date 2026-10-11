import { NextResponse, after } from "next/server";
import { z } from "zod";
import { cookieNames, dashboardConfig, LOGIN_LINK_TTL_S } from "@/lib/dashboard/config";
import { sendMail } from "@/lib/dashboard/mail";
import { mailConfigured } from "@/lib/mailer";
import { clientIp, limited, noStore, sameOrigin } from "@/lib/dashboard/request-guards";
import { hashNonce, newNonce, signToken } from "@/lib/dashboard/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().trim().email().max(200) });

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/**
 * Asks for a sign-in link. The answer is always the same, whoever asks and
 * whether or not the address is allowed, so this can't be used to discover who
 * has access. A random challenge cookie is always set for the same reason; the
 * emailed link is bound to it, so it only works in the browser that asked.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false }, { status: 403, headers: noStore });
  if (!dashboardConfig.secret()) {
    console.error("[dashboard] DASHBOARD_SESSION_SECRET is missing or shorter than 32 characters; sign-in is disabled.");
    return NextResponse.json({ ok: false, error: "Sign-in is not configured on this deployment." }, { status: 503, headers: noStore });
  }

  const ip = clientIp(req);
  if (limited(`req:ip:${ip}`, 6, 15 * 60_000)) return NextResponse.json({ ok: false, error: "Too many attempts. Try again in a few minutes." }, { status: 429, headers: noStore });

  let email = "";
  try {
    const parsed = schema.safeParse(await req.json());
    if (parsed.success) email = parsed.data.email.toLowerCase();
  } catch {
    /* fall through to the generic answer */
  }

  const nonce = newNonce();
  const res = NextResponse.json({ ok: true }, { headers: noStore });
  res.cookies.set(cookieNames().challenge, nonce, { httpOnly: true, secure: dashboardConfig.isProd(), sameSite: "lax", path: "/", maxAge: LOGIN_LINK_TTL_S });

  if (email && !limited(`req:email:${email}`, 3, 15 * 60_000) && dashboardConfig.isAllowed(email)) {
    const token = signToken("login", { sub: email, nh: hashNonce(nonce) }, LOGIN_LINK_TTL_S);
    if (token) {
      const link = `${dashboardConfig.origin()}/api/dashboard/auth/verify?t=${encodeURIComponent(token)}`;
      // Sent after the response so allowed and unknown addresses take the same time.
      after(async () => {
        if (!mailConfigured() && !dashboardConfig.isProd()) {
          console.log(`[dashboard] SMTP_PASS not set; dev sign-in link for ${email}:\n${link}`);
          return;
        }
        const minutes = Math.round(LOGIN_LINK_TTL_S / 60);
        const r = await sendMail({
          to: [email],
          subject: "Your WonderApps dashboard sign-in link",
          text: `Sign in to the WonderApps dashboard:\n\n${link}\n\nThe link works for ${minutes} minutes, once, in the browser you asked from. If you didn't ask, ignore this email.`,
          html: `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:460px;margin:0 auto;padding:32px 24px;color:#111">
<p style="font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:#6e6e73;margin:0 0 18px">WonderApps</p>
<h1 style="font-size:24px;margin:0 0 12px">Sign in to your dashboard</h1>
<p style="font-size:15px;line-height:1.5;color:#444;margin:0 0 24px">This link works for ${minutes} minutes, in the browser you asked from. If you didn't ask for it, you can ignore this email.</p>
<a href="${esc(link)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 22px;border-radius:999px">Open the dashboard</a>
</div>`,
        });
        if (!r.ok) console.error("[dashboard] could not send sign-in link:", r.reason);
      });
    }
  }
  return res;
}
