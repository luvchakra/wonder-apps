import nodemailer from "nodemailer";
import { site } from "@/content/site";

export type MailResult = { ok: true } | { ok: false; reason: string };

/**
 * The one place that sends email: the contact form, dashboard sign-in links and newsletters.
 * GoDaddy Workspace Email over SMTP, signed in as the WonderApps mailbox (connect@wonderapps.biz).
 * GoDaddy only relays mail whose From is the signed-in mailbox, so the sender defaults to it.
 */
const smtp = () => ({
  host: process.env.SMTP_HOST || "smtpout.secureserver.net",
  port: Number.parseInt(process.env.SMTP_PORT || "465", 10),
  user: process.env.SMTP_USER || site.contactEmail,
  pass: process.env.SMTP_PASS || "",
});

/** Whether a password is set; host, port and mailbox have working defaults. */
export const mailConfigured = () => smtp().pass.length > 0;

/** The From line: CONTACT_FROM if set, otherwise the signed-in mailbox. */
export const defaultFrom = () => process.env.CONTACT_FROM || `WonderApps <${smtp().user}>`;

export async function sendMail(opts: {
  to: string[];
  subject: string;
  text: string;
  html: string;
  from?: string;
  replyTo?: string;
  /** A stable id for the message (e.g. one newsletter per period), so a repeat shows as the same email. */
  messageKey?: string;
}): Promise<MailResult> {
  const { host, port, user, pass } = smtp();
  if (!pass) return { ok: false, reason: "SMTP_PASS is not set" };
  try {
    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      // Fail fast inside a serverless function rather than hang until the platform kills it.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
    await transport.sendMail({
      from: opts.from || defaultFrom(),
      to: opts.to,
      replyTo: opts.replyTo,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
      messageId: opts.messageKey ? `<${opts.messageKey.replace(/[^\w.-]/g, "-")}@${user.split("@")[1] ?? "wonderapps.biz"}>` : undefined,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "send failed" };
  }
}
