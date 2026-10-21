import { randomBytes } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a local production build (`next build` + `next start`), never
 * against wonderapps.biz. See docs/testing.md.
 *
 *   npm run e2e                               # every spec, fresh build
 *   npm run e2e -- e2e/contact.spec.ts        # chosen specs
 *   E2E_SKIP_BUILD=1 npm run e2e -- …         # reuse the last build
 *
 * The server gets no mail password and no recipients, so the contact form can never send an
 * email from a test, and no dashboard database URLs, cron secret or progress write key, so a
 * test can neither read a product's data nor write to the WonderApps database.
 */

const PORT = Number(process.env.E2E_PORT || 3210);
const BASE_URL = `http://localhost:${PORT}`;

// One random secret per run, shared by the server and the tests that mint a dashboard session.
process.env.DASHBOARD_SESSION_SECRET ||= randomBytes(32).toString("base64url");
process.env.DASHBOARD_ALLOWED_EMAILS = "e2e@example.invalid";

/** Time budget for one run (minutes). Past it, Playwright stops starting tests and reports the rest as not run. */
const budgetMin = Number(process.env.E2E_BUDGET_MIN || 25);

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  forbidOnly: !!process.env.CI,
  // One retry; a test that only passes on retry is reported as flaky and needs a root cause.
  retries: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  globalTimeout: budgetMin * 60_000,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "test-results/results.json" }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /public\.spec\.ts/ },
  ],
  webServer: {
    command: process.env.E2E_SKIP_BUILD ? `npx next start -p ${PORT}` : `npm run build && npx next start -p ${PORT}`,
    url: BASE_URL,
    timeout: 300_000,
    reuseExistingServer: false,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      DASHBOARD_SESSION_SECRET: process.env.DASHBOARD_SESSION_SECRET,
      DASHBOARD_ALLOWED_EMAILS: process.env.DASHBOARD_ALLOWED_EMAILS,
      // Never send mail, never reach a product database, never write progress.
      SMTP_PASS: "",
      CONTACT_RECIPIENTS: "",
      CRON_SECRET: "",
      PROGRESS_WRITE_KEY: "",
      // Never reach WonderJobs: with no key, /careers shows its not-set-up state.
      WONDERJOBS_CAREERS_KEY: "",
      WONDERHOME_DATABASE_URL: "",
      WONDERJOBS_DATABASE_URL: "",
      WONDERCREATOR_DATABASE_URL: "",
      WONDERARK_DATABASE_URL: "",
      WONDERID_DATABASE_URL: "",
      NEXT_PUBLIC_SITE_URL: BASE_URL,
    },
  },
});
