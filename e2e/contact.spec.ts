import { expect, test } from "@playwright/test";

/**
 * The contact form, end to end. The test server has no mail password (playwright.config.ts), so
 * a complete, valid message reaches the point of sending and is refused with the "not
 * configured" answer: nothing is ever emailed from a test.
 */

test("a complete message reaches the send step (and is not sent: no mail configured)", async ({ page }) => {
  await page.goto("/contact?interest=wonderagent");
  // The old WonderAgent slug preselects WonderID.
  await expect(page.getByRole("button", { name: "WonderID", pressed: true })).toBeVisible();

  await page.getByLabel("Name").fill("E2E Test");
  await page.getByLabel("Email").fill("e2e@example.invalid");
  await page.getByLabel("Message").fill("An automated end-to-end check of the contact form.");
  const [res] = await Promise.all([page.waitForResponse("**/api/contact"), page.getByRole("button", { name: "Send message" }).click()]);
  expect(res.status()).toBe(503);
  await expect(page.getByRole("alert").filter({ hasText: /not configured/i })).toBeVisible();
});

test("the server rejects what the browser would", async ({ request }) => {
  const bad = await request.post("/api/contact", { data: { name: "E2E", email: "not-an-email", message: "Long enough message." } });
  expect(bad.status()).toBe(422);
  expect((await bad.json()).field).toBe("email");

  const short = await request.post("/api/contact", { data: { name: "E2E", email: "e2e@example.invalid", message: "short" } });
  expect(short.status()).toBe(422);
  expect((await short.json()).field).toBe("message");

  const malformed = await request.fetch("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, data: Buffer.from("{not json") });
  expect(malformed.status()).toBe(400);
});

test("a bot that fills the honeypot is told it worked and nothing happens", async ({ request }) => {
  const res = await request.post("/api/contact", {
    data: { name: "Bot", email: "bot@example.invalid", message: "Buy things from me today.", website: "https://spam.example" },
  });
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
});
