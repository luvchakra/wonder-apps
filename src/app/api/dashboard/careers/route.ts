import { NextResponse } from "next/server";
import { z } from "zod";
import { keyStatus, setKey } from "@/lib/careers/key";
import { forgetJobsMemo, testConnection } from "@/lib/careers/wonderjobs";
import { clientIp, limited, noStore, sameOrigin } from "@/lib/dashboard/request-guards";
import { getSession } from "@/lib/dashboard/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save"), key: z.string().max(300) }),
  z.object({ action: z.literal("clear") }),
  z.object({ action: z.literal("test") }),
]);

/** Admin only: save, clear or test the WonderJobs career-site key. Responses carry the mask, never the key. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401, headers: noStore });
  if (!sameOrigin(req)) return NextResponse.json({ ok: false }, { status: 403, headers: noStore });
  if (limited(`careers-key:${session.email}:${clientIp(req)}`, 30, 60 * 60_000))
    return NextResponse.json({ ok: false, error: "Too many changes. Try again later." }, { status: 429, headers: noStore });

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Malformed request." }, { status: 400, headers: noStore });

  if (parsed.data.action === "test") return NextResponse.json({ ok: true, test: await testConnection() }, { headers: noStore });

  const r = await setKey(parsed.data.action === "save" ? parsed.data.key : null, session.email);
  if (!r.ok) return NextResponse.json(r, { status: 400, headers: noStore });
  forgetJobsMemo();
  return NextResponse.json({ ok: true, status: await keyStatus() }, { headers: noStore });
}
