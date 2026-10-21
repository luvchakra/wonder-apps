/** A scripted fetch: each call takes the next response (or throws it) and is recorded. */
export type Call = { url: string; method: string; headers: Record<string, string>; body: string | null };

export function scriptedFetch(script: (Response | Error | ((c: Call) => Response | Promise<Response>))[]) {
  const calls: Call[] = [];
  const f = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const call: Call = {
      url: String(input),
      method: init?.method ?? "GET",
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      body: typeof init?.body === "string" ? init.body : null,
    };
    calls.push(call);
    const next = script.shift();
    if (!next) throw new Error(`unexpected fetch ${call.method} ${call.url}`);
    if (next instanceof Error) throw next;
    return typeof next === "function" ? next(call) : next;
  }) as typeof fetch;
  return { f, calls };
}

export const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

export const job = (over: Record<string, unknown> = {}) => ({
  id: "job_1",
  title: "e2e Senior Engineer",
  location: "Bengaluru",
  workMode: "hybrid",
  jobType: "full_time",
  salaryMin: 2000000,
  salaryMax: 3000000,
  currency: "INR",
  description: "Line one\n\n<script>alert(1)</script>",
  skills: ["TypeScript"],
  company: "WonderApps",
  updatedAt: "2026-10-01T00:00:00Z",
  ...over,
});

// Built at runtime so the secret scanner doesn't mistake a fake test key for a real one.
export const KEY = ["wjcs", "test", "0".repeat(16), "WXYZ"].join("_");

/** Silences console output for the duration of fn, returning everything that would have been logged. */
export async function captureLogs<T>(fn: () => Promise<T>): Promise<{ result: T | undefined; error: unknown; logs: string }> {
  const out: string[] = [];
  const orig = { log: console.log, warn: console.warn, error: console.error };
  console.log = console.warn = console.error = (...a: unknown[]) => void out.push(a.map(String).join(" "));
  try {
    return { result: await fn(), error: null, logs: out.join("\n") };
  } catch (error) {
    return { result: undefined, error, logs: out.join("\n") };
  } finally {
    Object.assign(console, orig);
  }
}
