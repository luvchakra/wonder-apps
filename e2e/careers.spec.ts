import { expect, test } from "@playwright/test";
import { makeSessionToken } from "../src/lib/dashboard/tokens";

/**
 * The careers pages against a test server with no WonderJobs key and no database write key, so
 * nothing ever reaches WonderJobs: /careers shows its not-set-up state, and the status page and
 * the apply route are checked for what they do before forwarding. Mocked WonderJobs answers are
 * covered by the unit tests in tests/careers.
 */

test("careers is linked from the footer and says it isn't set up, with no sample jobs", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Careers" }).click();
  await expect(page).toHaveURL(/\/careers$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("Careers isn't set up yet")).toBeVisible();
  await expect(page.getByText(/Admin:/)).toHaveCount(0);
  await expect(page.locator('a[href^="/careers/"]')).toHaveCount(0);
});

test("careers is in the top menu", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("banner").getByRole("link", { name: "Careers" }).first().click();
  await expect(page).toHaveURL(/\/careers$/);
});

test("a job page with no key shows a plain state, not a form", async ({ page }) => {
  await page.goto("/careers/e2e-job");
  await expect(page.getByText("Careers isn't set up yet")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send application" })).toHaveCount(0);
});

test("the status page is noindex, sends no referrer, and handles a missing token", async ({ page }) => {
  const res = await page.goto("/careers/status");
  expect(res?.headers()["referrer-policy"]).toBe("no-referrer");
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
  await expect(page.getByText("We couldn't find that application. Use the link in your email.")).toBeVisible();
});

test("the status page posts the token to this site, never in a URL", async ({ page }) => {
  const token = "e2e_token_abcdefghijklmnop";
  const requests: { url: string; body: string | null }[] = [];
  page.on("request", (r) => requests.push({ url: r.url(), body: r.postData() }));
  await page.goto(`/careers/status?t=${token}`);
  await expect(page.getByText(/unavailable right now|couldn't find that application/)).toBeVisible();
  const statusCalls = requests.filter((r) => r.url.includes("/api/careers/status"));
  expect(statusCalls.length).toBeGreaterThan(0);
  for (const r of statusCalls) {
    expect(r.url).not.toContain(token);
    expect(r.body).toContain(token);
  }
  expect(requests.some((r) => r.url.includes("wonderapps.biz"))).toBe(false);
});

test("the apply route validates, keeps its honeypot quiet and refuses cross-site posts", async ({ request, baseURL }) => {
  const valid = { jobId: "e2e-job", name: "e2e Applicant", email: "e2e@example.invalid", resumeUrl: "https://example.com/cv", consent: true };
  const headers = { origin: baseURL!, "x-forwarded-for": "198.51.100.77" };
  const bad = await request.post("/api/careers/apply", { data: { ...valid, resumeUrl: "http://example.com/cv" }, headers });
  expect(bad.status()).toBe(400);
  const honey = await request.post("/api/careers/apply", { data: { ...valid, website: "spam" }, headers });
  expect(honey.status()).toBe(200);
  const cross = await request.post("/api/careers/apply", { data: valid, headers: { origin: "https://evil.example" } });
  expect(cross.status()).toBe(403);
});

test.describe("the key setting", () => {
  test("refuses anyone who isn't signed in", async ({ request }) => {
    const res = await request.post("/api/dashboard/careers", { data: { action: "save", key: "wjcs_e2e_0000000000000000" }, maxRedirects: 0 });
    expect(res.status()).toBe(401);
    const page = await request.get("/dashboard/careers", { maxRedirects: 0 });
    expect([307, 308]).toContain(page.status());
  });

  test("shows an admin no key and never a key value", async ({ page, context }) => {
    await context.setExtraHTTPHeaders({ cookie: `__Host-wa_session=${makeSessionToken("e2e@example.invalid")}` });
    await page.goto("/dashboard/careers");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Current key")).toBeVisible();
    await expect(page.getByRole("button", { name: "Test connection" })).toBeVisible();
    await page.getByRole("button", { name: "Test connection" }).click();
    await expect(page.getByText("No key to test yet.")).toBeVisible();
    await page.goto("/careers");
    await expect(page.getByText(/Admin:/)).toBeVisible();
  });
});
