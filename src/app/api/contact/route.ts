import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { startups } from "@/content/startups";

export const runtime = "nodejs";

const slugs = startups.map((s) => s.slug) as [string, ...string[]];

const schema = z.object({
  name: z.string().trim().min(2, "Please tell us your name.").max(120),
  email: z.string().trim().email("Please use a valid email address.").max(200),
  organisation: z.string().trim().max(160).optional().or(z.literal("")),
  role: z.enum(["investor", "partner", "customer", "press", "other"]).default("investor"),
  interests: z.array(z.enum(slugs)).max(slugs.length).default([]),
  message: z.string().trim().min(10, "A sentence or two helps us reply well.").max(4000),
  /** Honeypot: real users never see or fill this. Any value is accepted here and dropped below. */
  website: z.string().optional(),
});

function recipients(): string[] {
  return (process.env.CONTACT_RECIPIENTS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.includes("@"));
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ ok: false, error: first?.message ?? "Please check the form.", field: first?.path?.[0] }, { status: 422 });
  }
  const data = parsed.data;

  // Bots that fill the honeypot get a cheerful, useless success.
  if (data.website) return NextResponse.json({ ok: true });

  const to = recipients();
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM ?? "WonderApps <onboarding@resend.dev>";

  if (!apiKey || to.length === 0) {
    console.error("[contact] RESEND_API_KEY or CONTACT_RECIPIENTS is not configured; message not sent.", {
      hasKey: Boolean(apiKey),
      recipients: to.length,
    });
    return NextResponse.json(
      { ok: false, error: "The contact form is not configured on this deployment yet. Please try again later." },
      { status: 503 },
    );
  }

  const interested = data.interests.map((slug) => startups.find((s) => s.slug === slug)?.name ?? slug);
  const subject = `[WonderApps] ${data.role} enquiry from ${data.name}${interested.length ? ` · ${interested.join(", ")}` : ""}`;

  const text = [
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Organisation: ${data.organisation || "—"}`,
    `Role: ${data.role}`,
    `Interested in: ${interested.length ? interested.join(", ") : "—"}`,
    "",
    data.message,
    "",
    `— Sent from the WonderApps contact form · ${new Date().toISOString()}`,
  ].join("\n");

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Inter,sans-serif;max-width:640px;margin:0 auto;color:#1d1d1f">
      <h2 style="margin:0 0 16px;font-size:20px">New ${escape(data.role)} enquiry</h2>
      <table style="border-collapse:collapse;width:100%;font-size:15px">
        <tr><td style="padding:6px 0;color:#6e6e73;width:140px">Name</td><td>${escape(data.name)}</td></tr>
        <tr><td style="padding:6px 0;color:#6e6e73">Email</td><td><a href="mailto:${escape(data.email)}">${escape(data.email)}</a></td></tr>
        <tr><td style="padding:6px 0;color:#6e6e73">Organisation</td><td>${escape(data.organisation || "—")}</td></tr>
        <tr><td style="padding:6px 0;color:#6e6e73">Interested in</td><td>${escape(interested.join(", ") || "—")}</td></tr>
      </table>
      <div style="margin-top:20px;padding:16px;border-radius:12px;background:#f5f5f7;white-space:pre-wrap;line-height:1.5">${escape(data.message)}</div>
      <p style="margin-top:20px;font-size:12px;color:#86868b">Sent from the WonderApps contact form · ${new Date().toUTCString()}</p>
    </div>`;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from, to, replyTo: data.email, subject, text, html });
    if (error) {
      console.error("[contact] Resend rejected the message", error);
      return NextResponse.json({ ok: false, error: "We couldn't send your message just now. Please try again in a minute." }, { status: 502 });
    }
  } catch (err) {
    console.error("[contact] Resend call failed", err);
    return NextResponse.json({ ok: false, error: "We couldn't send your message just now. Please try again in a minute." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
