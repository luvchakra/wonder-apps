#!/usr/bin/env node
/**
 * Turns Playwright's JSON report into a short summary: passed, failed, flaky (passed only on
 * retry) and not run (skipped, or cut off by the run's time budget). Printed to the console and,
 * in GitHub Actions, to the job summary. Exits 1 when anything failed or never ran.
 *
 *   node scripts/e2e-summary.mjs [test-results/results.json]
 */
import { appendFileSync, existsSync, readFileSync } from "node:fs";

const file = process.argv[2] || "test-results/results.json";
if (!existsSync(file)) {
  console.error(`No report at ${file}: the run ended before Playwright wrote it.`);
  process.exit(1);
}
const report = JSON.parse(readFileSync(file, "utf8"));

const rows = [];
const walk = (suite, trail) => {
  for (const s of suite.suites ?? []) walk(s, [...trail, s.title].filter(Boolean));
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests ?? []) {
      // expected | unexpected | flaky | skipped
      const outcome = t.status ?? "skipped";
      const interrupted = (t.results ?? []).some((r) => r.status === "interrupted");
      rows.push({ title: [...trail, spec.title].join(" › "), project: t.projectName, outcome: interrupted ? "notrun" : outcome, file: spec.file });
    }
  }
};
walk(report, []);

const count = (o) => rows.filter((r) => r.outcome === o).length;
const passed = count("expected");
const failed = count("unexpected");
const flaky = count("flaky");
const notRun = count("skipped") + count("notrun");
const minutes = ((report.stats?.duration ?? 0) / 60000).toFixed(1);

const lines = [
  `### End-to-end: ${failed || count("notrun") ? "❌" : flaky ? "⚠️" : "✅"} ${passed} passed · ${failed} failed · ${flaky} flaky · ${notRun} not run (${minutes} min)`,
  "",
];
const list = (label, o) => {
  const hit = rows.filter((r) => r.outcome === o);
  if (!hit.length) return;
  lines.push(`**${label}**`, ...hit.map((r) => `- ${r.title} \`[${r.project}]\` (${r.file})`), "");
};
list("Failed", "unexpected");
list("Flaky: passed only on retry, needs a root cause", "flaky");
list("Not run: cut off by the time budget", "notrun");
list("Skipped", "skipped");

const text = lines.join("\n");
console.log(text);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + "\n");
process.exit(failed || count("notrun") ? 1 : 0);
