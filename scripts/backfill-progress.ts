/**
 * Rebuilds the progress history from each product tracker's git history, so the trend charts
 * start with the past rather than on the day recording began.
 *
 *   PROGRESS_WRITE_KEY=… npx tsx scripts/backfill-progress.ts [--dry-run] [--work <dir>]
 *
 * For every day a product's tracker file changed, the last version committed that day (in the
 * founder's time zone) is parsed with the same parser /appstracker uses and recorded as that
 * day's snapshot (source "backfill"). Versions the current parser can't read are skipped and
 * counted, never recorded as zeros. Today is left to the daily cron. Days already recorded are
 * kept (the first snapshot of a day wins), so the script is safe to re-run.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { TRACKER_SOURCES } from "../src/lib/tracker-parsers";
import {
  payloadFor,
  today,
  type RecordPayload,
} from "../src/lib/progress/record";
import { restRpc } from "../src/lib/content/supabase";

const dryRun = process.argv.includes("--dry-run");
const workArg = process.argv.indexOf("--work");
const work = path.resolve(
  workArg === -1 ? ".backfill" : process.argv[workArg + 1],
);
const writeKey = process.env.PROGRESS_WRITE_KEY;
if (!dryRun && !writeKey) {
  console.error("Set PROGRESS_WRITE_KEY (or pass --dry-run).");
  process.exit(1);
}

const tz = process.env.DASHBOARD_TIMEZONE || "Asia/Kolkata";
const dayOf = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
const git = (cwd: string, ...args: string[]) =>
  execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });

mkdirSync(work, { recursive: true });
const skipToday = today(tz);

async function main() {
  for (const [slug, source] of Object.entries(TRACKER_SOURCES)) {
    const m = source.raw.match(
      /raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/,
    );
    if (!m)
      throw new Error(`${slug}: can't read repo and path from ${source.raw}`);
    const [, owner, repo, branch, file] = m;
    const dir = path.join(work, repo);
    if (existsSync(dir)) git(dir, "fetch", "--quiet", "origin", branch);
    else
      execFileSync("git", [
        "clone",
        "--quiet",
        "--filter=blob:none",
        "--no-checkout",
        "--branch",
        branch,
        `https://github.com/${owner}/${repo}.git`,
        dir,
      ]);

    // Newest first: the first commit seen for a day is that day's last version.
    const log = git(
      dir,
      "log",
      `origin/${branch}`,
      "--format=%H %cI",
      "--",
      file,
    )
      .trim()
      .split("\n")
      .filter(Boolean);
    const perDay = new Map<string, string>();
    for (const line of log) {
      const [sha, when] = line.split(" ");
      const day = dayOf(when);
      if (day !== skipToday && !perDay.has(day)) perDay.set(day, sha);
    }

    let recorded = 0,
      kept = 0,
      unreadable = 0;
    const days = [...perDay.keys()].sort();
    for (const day of days) {
      const sha = perDay.get(day)!;
      let payload: RecordPayload;
      try {
        payload = payloadFor(
          slug,
          source.parse(git(dir, "show", `${sha}:${file}`)),
          day,
          "backfill",
          sha,
        );
      } catch {
        unreadable++;
        continue;
      }
      if (dryRun) {
        const done = payload.rows.reduce((n, r) => n + r.done, 0);
        const total = payload.rows.reduce((n, r) => n + r.total, 0);
        console.log(`  ${slug} ${day} ${sha.slice(0, 7)} ${done}/${total}`);
        recorded++;
        continue;
      }
      const id = await restRpc<number | null>("record_progress_snapshot", {
        write_key: writeKey,
        payload,
      });
      if (id === null) kept++;
      else recorded++;
    }
    console.log(
      `${slug}: ${days.length} days with changes, ${recorded} recorded, ${kept} already recorded, ${unreadable} unreadable by the current parser`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
