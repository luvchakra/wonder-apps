#!/usr/bin/env node
/**
 * Cheap UI check. Opens a path, optionally clicks elements, then prints each matched element's
 * text and box (CSS px, viewport coordinates). Text before pixels: read this output first.
 *
 *   node scripts/ui-check.mjs /dashboard --find heading:
 *   node scripts/ui-check.mjs / --click link:Careers --find heading:Careers --shot careers.jpg
 *
 *   <path>            page to open, relative to --base
 *   --base URL        default http://localhost:3000 (or UI_CHECK_BASE)
 *   --width PX        viewport width, default 1280
 *   --click ROLE:NAME click the first match, in order (repeatable)
 *   --find ROLE:NAME  print every match, up to 20 (repeatable; default heading:)
 *   --shot FILE.jpg   JPEG q60 cropped to the union of the matched boxes in the viewport
 *
 * ROLE:NAME uses ARIA roles and accessible names (substring, case-insensitive). An empty name
 * matches every element of that role. Set UI_CHECK_CHROMIUM to a browser executable to use a
 * pre-installed Chromium instead of Playwright's own.
 */
import { chromium } from "playwright-core";

const args = process.argv.slice(2);
const opts = {
  base: process.env.UI_CHECK_BASE || "http://localhost:3000",
  width: 1280,
  clicks: [],
  finds: [],
  shot: null,
};
let path = null;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--base") opts.base = args[++i];
  else if (a === "--width") opts.width = Number(args[++i]);
  else if (a === "--click") opts.clicks.push(args[++i]);
  else if (a === "--find") opts.finds.push(args[++i]);
  else if (a === "--shot") opts.shot = args[++i];
  else path = a;
}
if (path === null) {
  console.error("usage: node scripts/ui-check.mjs <path> [--click ROLE:NAME] [--find ROLE:NAME] [--shot FILE.jpg]");
  process.exit(2);
}
if (opts.finds.length === 0) opts.finds.push("heading:");

const settle = (page) => page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
const oneLine = (s) => s.replace(/\s+/g, " ").trim().slice(0, 80);

const browser = await chromium.launch({ executablePath: process.env.UI_CHECK_CHROMIUM || undefined });
try {
  const page = await browser.newPage({ viewport: { width: opts.width, height: 800 } });
  const problems = [];
  page.on("pageerror", (e) => problems.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(m.text());
  });

  const locate = (spec) => {
    const at = spec.indexOf(":");
    const role = at === -1 ? spec : spec.slice(0, at);
    const name = at === -1 ? "" : spec.slice(at + 1);
    return name ? page.getByRole(role, { name }) : page.getByRole(role);
  };

  await page.goto(new URL(path, opts.base).href, { waitUntil: "load" });
  await settle(page);

  for (const spec of opts.clicks) {
    await locate(spec).first().click();
    await settle(page);
    console.log(`click ${spec}`);
  }

  const boxes = [];
  for (const spec of opts.finds) {
    const matches = locate(spec);
    const count = await matches.count();
    console.log(`${spec}: ${count} match${count === 1 ? "" : "es"}`);
    for (let k = 0; k < Math.min(count, 20); k++) {
      const el = matches.nth(k);
      await el.scrollIntoViewIfNeeded().catch(() => {});
      const box = await el.boundingBox();
      const text = oneLine(await el.innerText({ timeout: 2000 }).catch(() => ""));
      const at = box
        ? `box=${Math.round(box.x)},${Math.round(box.y)},${Math.round(box.width)},${Math.round(box.height)}`
        : "box=hidden";
      console.log(`  [${k}] ${at} text="${text}"`);
      if (box && box.width > 0 && box.height > 0) boxes.push(box);
    }
  }

  if (problems.length) {
    console.log(`console/page errors: ${problems.length}`);
    for (const p of problems.slice(0, 3)) console.log(`  ${oneLine(p)}`);
  }

  if (opts.shot && boxes.length) {
    const x0 = Math.max(0, Math.min(...boxes.map((b) => b.x)));
    const y0 = Math.max(0, Math.min(...boxes.map((b) => b.y)));
    const x1 = Math.min(opts.width, Math.max(...boxes.map((b) => b.x + b.width)));
    const y1 = Math.min(800, Math.max(...boxes.map((b) => b.y + b.height)));
    await page.screenshot({
      path: opts.shot,
      type: "jpeg",
      quality: 60,
      clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 },
    });
    console.log(`shot ${opts.shot}`);
  }
} finally {
  await browser.close();
}
