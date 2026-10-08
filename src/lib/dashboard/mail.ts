import { Resend } from "resend";
import { dashboardConfig } from "./config";

export type MailResult = { ok: true } | { ok: false; reason: string };

/** One place that talks to Resend for dashboard mail (sign-in links and newsletters). */
export async function sendMail(opts: { to: string[]; subject: string; html: string; text: string; idempotencyKey?: string }): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, reason: "RESEND_API_KEY is not set" };
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from: dashboardConfig.from(), to: opts.to, subject: opts.subject, html: opts.html, text: opts.text }, opts.idempotencyKey ? { idempotencyKey: opts.idempotencyKey } : undefined);
    return error ? { ok: false, reason: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "send failed" };
  }
}
