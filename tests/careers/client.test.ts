import assert from "node:assert/strict";
import { test } from "node:test";
import { baseUrl, CareersError, createClient } from "../../src/lib/careers/wonderjobs";
import { captureLogs, job, json, KEY, scriptedFetch } from "./helpers";

const BASE = "https://jobs.wonderapps.biz";

test("every call sends the key as a Bearer token to the fixed base URL", async () => {
  const { f, calls } = scriptedFetch([json(200, { site: { name: "x", retentionMonths: 12 }, jobs: [job()] })]);
  await captureLogs(() => createClient(KEY, BASE, f).listJobs());
  assert.equal(calls[0].url, `${BASE}/api/careers/v1/jobs`);
  assert.equal(calls[0].headers.authorization, `Bearer ${KEY}`);
});

test("only https://*.wonderapps.biz may override the base URL", async () => {
  await captureLogs(async () => {
    assert.equal(baseUrl(undefined), BASE);
    assert.equal(baseUrl("https://staging.wonderapps.biz"), "https://staging.wonderapps.biz");
    for (const bad of ["http://jobs.wonderapps.biz", "https://evil.com", "https://wonderapps.biz.evil.com", "https://x.wonderapps.biz:8443", "https://x.wonderapps.biz/path", "nonsense"])
      assert.equal(baseUrl(bad), BASE, bad);
  });
});

test("a GET is retried once on a network error and once on a 5xx", async () => {
  const net = scriptedFetch([new TypeError("fetch failed"), json(200, { site: {}, jobs: [] })]);
  await captureLogs(() => createClient(KEY, BASE, net.f).listJobs());
  assert.equal(net.calls.length, 2);

  const five = scriptedFetch([json(503, {}), json(502, {})]);
  const { error } = await captureLogs(() => createClient(KEY, BASE, five.f).listJobs());
  assert.equal(five.calls.length, 2, "two attempts, no more");
  assert.ok(error instanceof CareersError && error.kind === "unavailable");
});

test("a POST is never retried", async () => {
  const { f, calls } = scriptedFetch([json(503, {})]);
  const { error } = await captureLogs(() => createClient(KEY, BASE, f).apply("job_1", { name: "A B", email: "a@b.co", resumeUrl: "https://x.co/cv", consent: true }));
  assert.equal(calls.length, 1);
  assert.ok(error instanceof CareersError && error.kind === "unavailable");
  const net = scriptedFetch([new TypeError("fetch failed")]);
  await captureLogs(() => createClient(KEY, BASE, net.f).status("tok_1234567890", "view"));
  assert.equal(net.calls.length, 1);
});

test("a timeout surfaces as unavailable", async () => {
  const err = Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" });
  const { f } = scriptedFetch([err, err]);
  const { error, logs } = await captureLogs(() => createClient(KEY, BASE, f).getJob("job_1"));
  assert.ok(error instanceof CareersError && error.kind === "unavailable");
  assert.match(logs, /timeout/);
});

test("the client sets an 8 second timeout signal", async () => {
  let signal: AbortSignal | undefined;
  const f = (async (_u: unknown, init?: RequestInit) => ((signal = init?.signal ?? undefined), json(200, { site: {}, jobs: [] }))) as typeof fetch;
  await captureLogs(() => createClient(KEY, BASE, f).listJobs());
  assert.ok(signal, "a signal is passed");
});

test("401, 404, 409 and 429 map to the right messages", async () => {
  const cases: [number, Record<string, string>, string, RegExp][] = [
    [401, {}, "unauthorized", /isn't available/],
    [404, {}, "not_found", /no longer open/],
    [409, {}, "conflict", /already applied/i],
    [429, { "retry-after": "17" }, "busy", /try again shortly/],
    [400, {}, "bad_input", /Résumé link must be https/],
  ];
  for (const [status, headers, kind, re] of cases) {
    const body = status === 409 ? { error: "You already applied for this job." } : status === 400 ? { error: "Résumé link must be https" } : { error: "x" };
    const { f } = scriptedFetch([json(status, body, headers)]);
    const { error } = await captureLogs(() => createClient(KEY, BASE, f).apply("job_1", { name: "A B", email: "a@b.co", resumeUrl: "https://x.co/cv", consent: true }));
    assert.ok(error instanceof CareersError, String(status));
    assert.equal(error.kind, kind);
    assert.match(error.message, re);
    if (status === 429) assert.equal(error.retryAfter, 17);
  }
});

test("the key never appears in an error or a log line", async () => {
  for (const r of [json(401, { error: `bad key ${KEY}` }), json(500, { error: KEY }), new TypeError(`connect failed ${KEY}`)]) {
    const { f } = scriptedFetch([r, r instanceof Error ? r : json(500, {})]);
    const { error, logs } = await captureLogs(() => createClient(KEY, BASE, f).getJob("job_1"));
    assert.ok(error instanceof CareersError);
    assert.ok(!error.message.includes(KEY) && !String(error.stack).includes(KEY), "error message");
    assert.ok(!logs.includes(KEY), "logs");
  }
});

test("the status token travels in the body, never in the URL", async () => {
  const token = ["tok", "x".repeat(20)].join("_");
  const { f, calls } = scriptedFetch([json(200, { application: { status: "new" } })]);
  const { logs } = await captureLogs(() => createClient(KEY, BASE, f).status(token, "withdraw"));
  assert.equal(calls[0].url, `${BASE}/api/careers/v1/applications/status`);
  assert.ok(!calls[0].url.includes(token));
  assert.deepEqual(JSON.parse(calls[0].body!), { token, action: "withdraw" });
  assert.ok(!logs.includes(token));
});
