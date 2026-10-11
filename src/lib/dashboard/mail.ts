import { sendMail as send, type MailResult } from "@/lib/mailer";
import { dashboardConfig } from "./config";

export type { MailResult };

/** Dashboard mail (sign-in links and newsletters) through the site's one mailer, from the dashboard's sender. */
export function sendMail(opts: { to: string[]; subject: string; html: string; text: string; messageKey?: string }): Promise<MailResult> {
  return send({ ...opts, from: dashboardConfig.from() });
}
