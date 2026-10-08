#!/usr/bin/env node
/**
 * Renders each startup's printable deck route to public/decks/<slug>-investor-deck.pdf.
 * Run after any change to startups.ts, deck-copy.ts or the slide components:
 *   npm run decks            (starts `next start` on :3111 if nothing is listening; needs a prior build)
 * The PDFs are committed so the site stays static.
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const PORT = process.env.DECKS_PORT || "3111";
const base = `http://localhost:${PORT}`;
const slugs = ["wonderhome", "wonderjobs", "wondercreator", "wonderark", "wonderid"];

async function up() {
  try { return (await fetch(base)).ok; } catch { return false; }
}

let server;
if (!(await up())) {
  server = spawn("npx", ["next", "start", "-p", PORT], { stdio: "ignore" });
  for (let i = 0; i < 60 && !(await up()); i++) await new Promise((r) => setTimeout(r, 500));
  if (!(await up())) { server.kill(); throw new Error("next start did not come up; run `npm run build` first"); }
}

mkdirSync("public/decks", { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
console.log("browser up");
try {
  for (const slug of slugs) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto(`${base}/decks/${slug}/print`, { waitUntil: "load" });
    const broken = await page.evaluate(() => [...document.querySelectorAll('.deck-print img')].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src));
    if (broken.length) throw new Error(`${slug}: ${broken.length} image(s) did not load: ${broken.slice(0, 3).join(", ")}`);
    const out = `public/decks/${slug}-investor-deck.pdf`;
    await page.pdf({ path: out, width: "1920px", height: "1080px", printBackground: true, preferCSSPageSize: true });
    console.log("wrote", out);
    await page.close();
  }
} finally {
  await browser.close();
  server?.kill();
}
