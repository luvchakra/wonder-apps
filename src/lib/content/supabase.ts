/**
 * Read access to the WonderApps database (Supabase project `wonderapps`). Reads use the
 * publishable key, which is meant to be public: row-level security lets it read the site's
 * copy and the progress history and nothing else, and every write path is refused for it.
 * Both values can be overridden per environment.
 */
export const SUPABASE_URL = (process.env.WONDERAPPS_SUPABASE_URL ?? "https://gsxvidvliqarhoxbyifo.supabase.co").replace(/\/$/, "");
export const SUPABASE_PUBLISHABLE_KEY = process.env.WONDERAPPS_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_Z_0nyZgj8Rs2ueIm6lby6g_6N5vZRcQ";

/** Pages built from the database are refreshed at most this often (seconds). */
export const CONTENT_REVALIDATE = 300;

type Cache = { revalidate: number; tags: string[] } | "no-store";

/** GET from the database's REST API. Throws on any failure so a page never renders from half an answer. */
export async function restGet<T>(path: string, cache: Cache): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
    ...(cache === "no-store" ? { cache: "no-store" as const } : { next: cache }),
  });
  if (!res.ok) throw new Error(`Database read failed (${res.status}) for ${path.split("?")[0]}`);
  return (await res.json()) as T;
}

/** Calls a database function (the progress recorder, the dashboard store and the careers key; all need the write key). */
export async function restRpc<T>(fn: string, body: unknown): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Database call ${fn} failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  // A function that returns nothing answers 204 with no body.
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}
