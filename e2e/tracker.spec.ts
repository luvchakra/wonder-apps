import { expect, test } from "@playwright/test";

/**
 * The public engineering tracker: rendered from the latest recorded snapshot, then refreshed live
 * from each product's tracker on GitHub. Never zeros.
 */

const PRODUCTS = ["WonderHome", "WonderJobs", "Wonder Creator", "WonderArk", "WonderID"];

test("the tracker shows all five products with real completion figures", async ({ page }) => {
  const live = page.waitForResponse("**/api/tracker");
  await page.goto("/appstracker");
  for (const name of PRODUCTS) await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  await live;
  // "N of M active stories" per product, none of them zero.
  const counts = await page.getByText(/\d[\d,]* of [\d,]+ active stories/).allInnerTexts();
  expect(counts.length).toBeGreaterThanOrEqual(5);
  for (const c of counts) expect(c, c).not.toMatch(/^0 of/);
});

test("the live tracker API parses every product", async ({ request }) => {
  const res = await request.get("/api/tracker");
  expect(res.status()).toBe(200);
  const json = (await res.json()) as { results: { slug: string; ok: boolean; rows?: { total: number }[]; error?: string }[] };
  expect(json.results).toHaveLength(5);
  for (const r of json.results) {
    expect(r.ok, `${r.slug}: ${r.error ?? ""}`).toBe(true);
    expect(r.rows!.reduce((n, x) => n + x.total, 0), r.slug).toBeGreaterThan(0);
  }
});
