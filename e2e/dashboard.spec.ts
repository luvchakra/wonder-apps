import { expect, test } from "@playwright/test";
import { makeSessionToken } from "../src/lib/dashboard/tokens";

/**
 * The private dashboard: closed without a session, and readable with one. The session is minted
 * for a throwaway address with the per-run secret from playwright.config.ts, so it works only
 * against the test server. No write key is configured there, so the dashboard has no stored
 * numbers and shows its empty state; the development trends read the public tracker history.
 */

const COOKIE = "__Host-wa_session"; // next start runs in production mode

test.describe("without a session", () => {
  test("every dashboard page sends you to sign in", async ({ page }) => {
    for (const path of ["/dashboard", "/dashboard/development", "/dashboard/wonderid", "/dashboard/newsletter"]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/dashboard\/login/);
    }
    await expect(page.getByRole("button", { name: /email me a sign-in link|send/i })).toBeVisible();
  });

  test("dashboard and cron endpoints refuse anonymous calls", async ({ request }) => {
    for (const path of ["/api/dashboard/newsletter/preview", "/api/cron/progress", "/api/cron/dashboard", "/api/cron/newsletter?cadence=weekly"]) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect([401, 403, 405, 503, 307], `${path} → ${res.status()}`).toContain(res.status());
    }
  });

  test("refresh refuses anonymous calls", async ({ request }) => {
    const res = await request.post("/api/dashboard/refresh", { maxRedirects: 0 });
    expect([401, 403, 307], `refresh → ${res.status()}`).toContain(res.status());
  });

  test("search engines are told to stay out of the dashboard", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/Disallow: \/dashboard/);
  });
});

test.describe("with a session", () => {
  test.beforeEach(async ({ context }) => {
    const token = makeSessionToken("e2e@example.invalid");
    expect(token, "DASHBOARD_SESSION_SECRET must be set by playwright.config.ts").toBeTruthy();
    await context.setExtraHTTPHeaders({ cookie: `${COOKIE}=${token}` });
  });

  test("the overview opens with a Refresh button and an empty state when nothing is stored", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("button", { name: "Refresh" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "No numbers to show yet" })).toBeVisible();
  });

  test("a product page shows the empty state too", async ({ page }) => {
    await page.goto("/dashboard/wonderid");
    await expect(page.getByRole("heading", { name: "No numbers to show yet" })).toBeVisible();
  });

  test("development shows the portfolio trends", async ({ page }) => {
    await page.goto("/dashboard/development");
    for (const title of ["Completion over time", "Stories done over time"]) {
      const card = page.locator("section", { has: page.getByRole("heading", { name: title }) });
      await expect(card.locator("svg[role=img]"), title).toBeVisible();
    }
    // One line per product, each in the legend.
    for (const name of ["WonderHome", "WonderJobs", "Wonder Creator", "WonderArk", "WonderID"])
      await expect(page.locator("section", { has: page.getByRole("heading", { name: "Completion over time" }) }).getByText(name)).toBeVisible();
  });

  test("a product's development page shows its trend and what moved", async ({ page }) => {
    await page.goto("/dashboard/development/wonderid");
    await expect(page.getByRole("heading", { name: "Done and in scope over time" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Moved in the last 7 days" })).toBeVisible();
    await expect(page.getByText(/% built/)).toBeVisible();
  });
});
