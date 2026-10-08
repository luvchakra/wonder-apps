import { dashboardConfig } from "./config";

/** Best-effort client IP for rate limiting (Vercel sets x-forwarded-for). */
export const clientIp = (req: Request) => (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";

/**
 * Same-origin check for state-changing requests. `Sec-Fetch-Site` is set by the browser and cannot be
 * forged by page script, so "same-origin" is trusted when present; otherwise (older clients) the Origin
 * header must match our host. A missing or foreign Origin is refused.
 */
export function sameOrigin(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    const o = new URL(origin);
    const canonical = new URL(dashboardConfig.origin()).host.replace(/^www\./, "");
    const allowed = new Set<string>([canonical, `www.${canonical}`]);
    const host = req.headers.get("host");
    if (host) allowed.add(host);
    return allowed.has(o.host);
  } catch {
    return false;
  }
}

/**
 * Tiny in-memory sliding-window limiter. On serverless each instance has its own
 * window, so this is a speed bump against guessing, not the security boundary:
 * that is the signed, browser-bound, ten-minute link plus the allow-list.
 */
const hits = new Map<string, number[]>();
export function limited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return recent.length > max;
}

export const noStore = { "Cache-Control": "no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow" } as const;
