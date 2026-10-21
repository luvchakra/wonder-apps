import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { POST } from "../../src/app/api/careers/apply/route";
import { forgetKeyMemo } from "../../src/lib/careers/key";
import { captureLogs, json, KEY, scriptedFetch } from "./helpers";

process.env.PROGRESS_WRITE_KEY = "";
process.env.WONDERJOBS_CAREERS_KEY = KEY;

let ip = 0;
const valid = { jobId: "job_1", name: "Asha Rao", email: "asha@example.invalid", resumeUrl: "https://drive.google.com/file/d/x", consent: true };
const req = (body: unknown, opts: { ip?: string; site?: string } = {}) =>
  new Request("http://localhost/api/careers/apply", {
    method: "POST",
    headers: { "content-type": "application/json", "sec-fetch-site": opts.site ?? "same-origin", "x-forwarded-for": opts.ip ?? `10.0.0.${++ip}` },
    body: JSON.stringify(body),
  });

async function withFetch<T>(script: Parameters<typeof scriptedFetch>[0], fn: () => Promise<T>) {
  const s = scriptedFetch(script);
  const orig = globalThis.fetch;
  globalThis.fetch = s.f;
  try {
    const out = await captureLogs(fn);
    return { ...out, calls: s.calls };
  } finally {
    globalThis.fetch = orig;
  }
}

beforeEach(() => forgetKeyMemo());

test("validation: required fields, https links, lengths and consent are checked before WonderJobs", async () => {
  const bad = [
    { ...valid, name: " " },
    { ...valid, email: "nope" },
    { ...valid, resumeUrl: "http://example.com/cv" },
    { ...valid, linkedinUrl: "javascript:alert(1)" },
    { ...valid, coverNote: "x".repeat(4001) },
    { ...valid, consent: false },
    { ...valid, jobId: "../admin" },
  ];
  for (const b of bad) {
    const { result, calls } = await withFetch([], () => POST(req(b)));
    assert.equal(result!.status, 400, JSON.stringify(b).slice(0, 80));
    assert.equal(calls.length, 0);
  }
});

test("a filled honeypot pretends success and never calls WonderJobs", async () => {
  const { result, calls } = await withFetch([], () => POST(req({ ...valid, website: "https://spam.example" })));
  assert.equal(result!.status, 200);
  assert.deepEqual(await result!.json(), { ok: true });
  assert.equal(calls.length, 0);
});

test("success only on a 200 from WonderJobs; the body is forwarded trimmed and never logged", async () => {
  const { result, calls, logs } = await withFetch([json(200, { ok: true, id: "app_1" })], () => POST(req({ ...valid, name: "  Asha Rao  ", phone: "", coverNote: "Hello" })));
  assert.equal(result!.status, 200);
  assert.match(calls[0].url, /\/api\/careers\/v1\/jobs\/job_1\/applications$/);
  const sent = JSON.parse(calls[0].body!);
  assert.equal(sent.name, "Asha Rao");
  assert.equal(sent.phone, undefined, "empty optional fields are dropped");
  assert.equal(sent.consent, true);
  assert.ok(!logs.includes("asha@example.invalid") && !logs.includes("Hello"), "no applicant data in logs");

  const failed = await withFetch([json(500, {})], () => POST(req(valid)));
  assert.equal(failed.result!.status, 502);
  assert.equal(((await failed.result!.json()) as { ok: boolean }).ok, false);
});

test("409 and 400 messages are passed through; 404 says the position closed", async () => {
  const dup = await withFetch([json(409, { error: "You already applied for this job." })], () => POST(req(valid)));
  assert.equal(dup.result!.status, 409);
  assert.equal(((await dup.result!.json()) as { error: string }).error, "You already applied for this job.");
  const closed = await withFetch([json(404, { error: "gone" })], () => POST(req(valid)));
  assert.equal(closed.result!.status, 404);
  assert.equal(((await closed.result!.json()) as { closed: boolean }).closed, true);
});

test("cross-site posts are refused", async () => {
  const { result, calls } = await withFetch([], () => POST(req(valid, { site: "cross-site" })));
  assert.equal(result!.status, 403);
  assert.equal(calls.length, 0);
});

test("about ten applications an hour per IP, then 429 with Retry-After", async () => {
  const script = Array.from({ length: 10 }, () => json(200, { ok: true, id: "a" }));
  const { calls } = await withFetch(script, async () => {
    for (let i = 0; i < 10; i++) assert.equal((await POST(req(valid, { ip: "203.0.113.9" }))).status, 200);
  });
  assert.equal(calls.length, 10);
  const over = await withFetch([], () => POST(req(valid, { ip: "203.0.113.9" })));
  assert.equal(over.result!.status, 429);
  assert.ok(over.result!.headers.get("retry-after"));
  assert.equal(over.calls.length, 0);
});
