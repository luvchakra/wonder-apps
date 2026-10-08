import { site } from "@/content/site";

/**
 * Dashboard configuration, all from environment variables (set in Vercel).
 * Read lazily so a missing value fails the one request that needs it, not the build.
 */
const list = (v: string | undefined) =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export const dashboardConfig = {
  /** The only people who can sign in. Removing an address revokes its sessions on their next request. */
  allowedEmails: () => list(process.env.DASHBOARD_ALLOWED_EMAILS),
  isAllowed: (email: string) => list(process.env.DASHBOARD_ALLOWED_EMAILS).includes(email.trim().toLowerCase()),
  /** HMAC key for sessions and sign-in links. At least 32 characters (`openssl rand -base64 48`). */
  secret: (): string | null => {
    const s = process.env.DASHBOARD_SESSION_SECRET ?? "";
    return s.length >= 32 ? s : null;
  },
  /** Bump to sign everyone out at once. */
  sessionVersion: () => process.env.DASHBOARD_SESSION_VERSION ?? "1",
  /** Day boundaries for every chart and newsletter. */
  timeZone: () => process.env.DASHBOARD_TIMEZONE || "Asia/Kolkata",
  /** Newsletter recipients; defaults to the people who can sign in. */
  recipients: () => {
    const r = list(process.env.NEWSLETTER_RECIPIENTS);
    return r.length ? r : list(process.env.DASHBOARD_ALLOWED_EMAILS);
  },
  /** Which automatic newsletters are on. Default: weekly. */
  cadence: (): Set<"weekly" | "monthly"> => {
    const raw = list(process.env.NEWSLETTER_CADENCE || "weekly");
    const out = new Set<"weekly" | "monthly">();
    if (raw.includes("weekly") || raw.includes("both")) out.add("weekly");
    if (raw.includes("monthly") || raw.includes("both")) out.add("monthly");
    return out;
  },
  from: () => process.env.NEWSLETTER_FROM || process.env.CONTACT_FROM || `WonderApps <${site.contactEmail}>`,
  /** Public origin used in emailed links; never taken from a request header. */
  origin: () => (process.env.NEXT_PUBLIC_SITE_URL ?? site.url).replace(/\/$/, ""),
  isProd: () => process.env.NODE_ENV === "production",
};

/** `__Host-` cookies need HTTPS; locally we fall back to plain names. */
export const cookieNames = () => {
  const p = dashboardConfig.isProd() ? "__Host-" : "";
  return { session: `${p}wa_session`, challenge: `${p}wa_challenge` };
};

export const SESSION_TTL_S = 12 * 60 * 60;
export const LOGIN_LINK_TTL_S = 10 * 60;
