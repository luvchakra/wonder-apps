import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import CareersPage from "../../src/app/careers/page";
import { metadata as statusMetadata } from "../../src/app/careers/status/page";
import { consentText } from "../../src/lib/careers/copy";
import { forgetKeyMemo } from "../../src/lib/careers/key";
import { forgetJobsMemo } from "../../src/lib/careers/wonderjobs";
import { captureLogs, job, json, KEY, scriptedFetch } from "./helpers";

process.env.PROGRESS_WRITE_KEY = "";

async function render(script: Parameters<typeof scriptedFetch>[0]) {
  const s = scriptedFetch(script);
  const orig = globalThis.fetch;
  globalThis.fetch = s.f;
  try {
    const { result, error } = await captureLogs(async () => renderToStaticMarkup(await CareersPage()));
    if (error) throw error;
    return { html: result!, calls: s.calls };
  } finally {
    globalThis.fetch = orig;
  }
}

beforeEach(() => {
  forgetKeyMemo();
  forgetJobsMemo();
  process.env.WONDERJOBS_CAREERS_KEY = KEY;
});

test("with no key, visitors see that careers isn't set up (and nothing is fetched)", async () => {
  process.env.WONDERJOBS_CAREERS_KEY = "";
  const { html, calls } = await render([]);
  assert.match(html, /Careers isn(&#x27;|')t set up yet/);
  assert.ok(!html.includes("Admin:"), "the reason is for admins only");
  assert.equal(calls.length, 0);
});

test("with no jobs, it says so rather than showing a placeholder", async () => {
  const { html } = await render([json(200, { site: { name: "x", retentionMonths: 12 }, jobs: [] })]);
  assert.match(html, /No open positions right now/);
  assert.ok(!/href="\/careers\/[^"]/.test(html), "no job links");
});

test("when WonderJobs is unreachable, it says unavailable and offers to try again", async () => {
  const { html } = await render([json(503, {}), json(503, {})]);
  assert.match(html, /unavailable right now/);
  assert.match(html, /Try again/);
});

test("lists only the jobs WonderJobs returns, with facts and skills", async () => {
  const { html } = await render([json(200, { site: { name: "x", retentionMonths: 12 }, jobs: [job()] })]);
  assert.match(html, /e2e Senior Engineer/);
  assert.match(html, /href="\/careers\/job_1"/);
  assert.match(html, /Hybrid/);
  assert.match(html, /Full-time/);
  assert.match(html, /TypeScript/);
  assert.equal((html.match(/href="\/careers\/[^"]+"/g) ?? []).length, 1, "no sample or hardcoded jobs");
});

test("the consent text carries the retention period only when WonderJobs gives one", () => {
  assert.equal(consentText("WonderApps", 12), "I agree that WonderApps stores my application to consider me for this and similar roles, and deletes it 12 months after its last update.");
  assert.equal(consentText("WonderApps", null), "I agree that WonderApps stores my application to consider me for this and similar roles.");
  assert.equal(consentText("WonderApps", undefined), "I agree that WonderApps stores my application to consider me for this and similar roles.");
});

test("the status page is noindex and sends no referrer", () => {
  assert.deepEqual(statusMetadata.robots, { index: false, follow: false });
  assert.equal(statusMetadata.referrer, "no-referrer");
});
