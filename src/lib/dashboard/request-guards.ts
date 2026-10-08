import { dashboardConfig } from "./config";

/** Best-effort client IP for rate limiting (Vercel sets x-forwarded-for). */
export const clientIp = (req: Request) => (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";

/**
 * Same-origin check for state-changing requests. Browsers always send Origin on
 * cross-site POSTs, so a missing or foreign Origin is refused.
 */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    const o = new URL(origin);
    const host = req.headers.get("host");
    const allowed = new Set<string>([new URL(dashboardConfig.origin()).host, new URL(dashboardConfig.origin()).host.replace(/^www\./, ""), `www.${new URL(dashboardConfig.origin()).host.replace(/^www\./, "")}`]);
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
