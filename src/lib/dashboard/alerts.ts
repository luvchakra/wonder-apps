import "server-only";
import { sendMail } from "@/lib/mailer";
import { dashboardConfig } from "./config";
import type { CollectResult } from "./store";

/**
 * After the daily collection: if the numbers couldn't be stored, or a connected product
 * couldn't be read (fully or partly), email the people who can sign in, so a broken day is
 * noticed that day rather than as a stale "as of" date. A product that was never connected
 * (no URL set) is a setup state, not an alert. Returns whether an email was sent.
 */
export async function alertOnProblems(r: CollectResult, names: Record<string, string>): Promise<boolean> {
  const problems: string[] = [];
  if (r.storeError) problems.push(`The numbers were collected but not stored: ${r.storeError}`);
  for (const p of r.products) {
    const name = names[p.slug] ?? p.slug;
    if (p.status === "unreachable") problems.push(`${name}: database unreachable${p.note ? ` (${p.note})` : ""}.`);
    else if (p.status === "partial") problems.push(`${name}: ${p.note ?? "some metrics could not be read."}`);
  }
  if (!problems.length) return false;
  const to = dashboardConfig.allowedEmails();
  if (!to.length) return false;
  const origin = dashboardConfig.origin();
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
  const sent = await sendMail({
    to,
    subject: `WonderApps dashboard: today's collection had ${problems.length} problem${problems.length > 1 ? "s" : ""}`,
    text: `Today's dashboard collection had problems:\n\n${problems.map((p) => `- ${p}`).join("\n")}\n\nThe dashboard keeps showing the last stored numbers. Press Refresh on ${origin}/dashboard to try again.`,
    html: `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:28px 24px;color:#111">
<p style="font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:#6e6e73;margin:0 0 14px">WonderApps dashboard</p>
<h1 style="font-size:20px;margin:0 0 12px">Today's collection had problems</h1>
<ul style="font-size:15px;line-height:1.5;color:#333;padding-left:18px">${problems.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
<p style="font-size:14px;color:#555">The dashboard keeps showing the last stored numbers. <a href="${esc(origin)}/dashboard">Open it and press Refresh</a> to try again.</p>
</div>`,
    messageKey: `dash-alert-${new Date().toISOString().slice(0, 10)}`,
  });
  if (!sent.ok) console.error("[dashboard] collection alert not sent:", sent.reason);
  return sent.ok;
}
