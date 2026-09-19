#!/usr/bin/env node
/**
 * Regenerates docs/progress.md — every story from every Wonder product, read
 * from each repository's own tracking documents.
 *
 *   npm run progress                      # fetch from GitHub (raw.githubusercontent.com)
 *   npm run progress -- --local ~/luvchakra   # read local clones instead (dir containing the four repos)
 *
 * Deterministic: markdown tables are located by their header cells, never by
 * line number. A product whose source cannot be fetched or parsed is reported
 * and omitted from the doc rather than written with wrong numbers.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve("docs/progress.md");
const RAW = "https://raw.githubusercontent.com/luvchakra";
const localRoot = (() => {
  const i = process.argv.indexOf("--local");
  return i === -1 ? null : path.resolve(process.argv[i + 1]);
})();

/* ---------- tiny markdown helpers ---------------------------------------- */
const splitRow = (line) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
const norm = (s) => s.replace(/\s+/g, "");
const unlink = (s) => s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
const untick = (s) => s.replace(/`/g, "");

/** All tables whose header matches, each with the nearest preceding ## / ### heading. */
function tables(md, headerCells) {
  const lines = md.split("\n");
  const needle = norm("|" + headerCells.join("|") + "|");
  const out = [];
  let h2 = "", h3 = "";
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith("## ")) { h2 = l.slice(3).trim(); h3 = ""; continue; }
    if (l.startsWith("### ")) { h3 = l.slice(4).trim(); continue; }
    if (norm(l).startsWith(needle) && /^\|?\s*:?-{2,}/.test(lines[i + 1] ?? "")) {
      const rows = [];
      for (let j = i + 2; j < lines.length && lines[j].trim().startsWith("|"); j++) rows.push(splitRow(lines[j]));
      out.push({ h2, h3, rows });
      i += rows.length + 1;
    }
  }
  return out;
}

const STATUS = [
  [/^(✅\s*)?done/i, "Done"],
  [/^(🟡\s*)?(mostly done|partial|in progress|in-progress)/i, "In progress"],
  [/^(⏸️\s*)?deferred/i, "Deferred"],
  [/^(🔁\s*)?superseded/i, "Superseded"],
  [/^(❔\s*)?unverified/i, "Unverified"],
  [/^(⛔\s*)?blocked/i, "Blocked"],
  [/^(⬜\s*)?(not started|backlog|todo|planned)/i, "Not started"],
  [/descoped|dropped|removed/i, "Set aside"],
];
/** Strips emphasis/underscores so "**Done** — note", "IN_PROGRESS" and "🟡 partial" all normalise. */
function normStatus(raw) {
  const s = raw.replace(/\*\*|__|`/g, "").replace(/_/g, " ").trim();
  for (const [re, label] of STATUS) if (re.test(s)) return label;
  return s.split(/\s*[—–-]\s*/)[0].trim() || "Unknown";
}

/* ---------- sources ------------------------------------------------------- */
async function read(repo, file) {
  if (localRoot) return readFile(path.join(localRoot, repo, file), "utf8");
  const res = await fetch(`${RAW}/${repo}/main/${file}`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`${repo}/${file}: HTTP ${res.status}`);
  return res.text();
}

const products = [
  {
    slug: "wonderhome", name: "WonderHome", repo: "wonder-home", groupLabel: "Module",
    sources: ["BACKLOG-INDEX.md", "tracking/PROGRESS.md", "backlogs/*.md"],
    async load() {
      const index = await read(this.repo, "BACKLOG-INDEX.md");
      const files = [...index.matchAll(/`(backlogs\/[^`]+\.md)`/g)].map((m) => m[1]);
      if (files.length === 0) throw new Error("wonderhome: no backlog files in BACKLOG-INDEX.md");
      const groups = [];
      for (const f of files) {
        const md = await read(this.repo, f);
        const title = (md.match(/^# WonderHome — (.+)$/m)?.[1] ?? f).trim();
        const t = tables(md, ["#", "Priority", "Story ID", "Story", "Status", "Notes"])[0];
        if (!t) throw new Error(`wonderhome: story table missing in ${f}`);
        groups.push({ name: title, stories: t.rows.map(([, prio, id, story, status, notes]) => ({ id, story, status: normStatus(status), note: `${prio}${notes ? " · " + notes : ""}` })) });
      }
      const p = await read(this.repo, "tracking/PROGRESS.md");
      return { groups, updated: p.match(/\|\s*Last updated\s*\|\s*([\d-]+)/)?.[1] ?? null };
    },
  },
  {
    slug: "wonderjobs", name: "WonderJobs", repo: "wonder-jobs", groupLabel: "Area",
    sources: ["docs/IMPLEMENTATION_TRACKER.md", "docs/PROGRESS.md"],
    async load() {
      const md = await read(this.repo, "docs/IMPLEMENTATION_TRACKER.md");
      const t = tables(md, ["ID", "Area", "Requirement", "Status", "Notes"])[0];
      if (!t) throw new Error("wonderjobs: requirement table missing");
      const byArea = new Map();
      for (const [id, area, req, status, notes] of t.rows) {
        if (!byArea.has(area)) byArea.set(area, []);
        byArea.get(area).push({ id, story: req, status: normStatus(status), note: notes });
      }
      const p = await read(this.repo, "docs/PROGRESS.md");
      return { groups: [...byArea].map(([name, stories]) => ({ name, stories })), updated: p.match(/^_Last updated:\s*([\d-]+)/m)?.[1] ?? null };
    },
  },
  {
    slug: "wonderark", name: "WonderArk", repo: "founder-collab", groupLabel: "Backlog › epic",
    sources: ["docs/PROGRESS-TRACKER.md"],
    async load() {
      const md = await read(this.repo, "docs/PROGRESS-TRACKER.md");
      // Skip the "What is left" digest (duplicates ids); keep the per-backlog sections.
      const body = md.slice(md.indexOf("\n## Platform build-out"));
      const ts = tables(body, ["ID", "Story", "Status", "Evidence / note"]);
      if (ts.length === 0) throw new Error("wonderark: story tables missing");
      const seen = new Set();
      const groups = ts.map((t) => ({
        name: `${t.h2}${t.h3 ? " › " + t.h3 : ""}`,
        stories: t.rows.flatMap(([id, story, status, note]) => {
          const cid = untick(id);
          if (seen.has(cid)) return [];
          seen.add(cid);
          return [{ id: cid, story, status: normStatus(status), note: untick(unlink(note)) }];
        }),
      })).filter((g) => g.stories.length);
      return { groups, updated: null };
    },
  },
  {
    slug: "wonderagent", name: "WonderAgent", repo: "wonder-agent", groupLabel: "Module (agent)",
    sources: ["docs/PROGRESS.md"],
    async load() {
      const md = await read(this.repo, "docs/PROGRESS.md");
      const ts = tables(md, ["Story", "Title", "Status"]);
      if (ts.length === 0) throw new Error("wonderagent: story tables missing");
      const groups = ts.map((t) => ({
        name: t.h3 || t.h2,
        stories: t.rows.map(([id, title, status]) => {
          const norm = normStatus(status);
          const note = status.includes("—") ? untick(status.replace(/\*\*/g, "").split("—").slice(1).join("—").trim()) : "";
          return { id, story: title, status: norm, note };
        }),
      }));
      return { groups, updated: md.match(/^Generated\s+([\d-]+)/m)?.[1] ?? null };
    },
  },
];

/* ---------- build ---------------------------------------------------------- */
const ACTIVE_EXCLUDED = new Set(["Deferred", "Superseded", "Set aside"]);
function tally(stories) {
  const c = { total: stories.length, done: 0, inProgress: 0, notStarted: 0, setAside: 0, other: 0 };
  for (const s of stories) {
    if (s.status === "Done") c.done++;
    else if (s.status === "In progress") c.inProgress++;
    else if (s.status === "Not started" || s.status === "Unverified") c.notStarted++;
    else if (ACTIVE_EXCLUDED.has(s.status)) c.setAside++;
    else c.other++;
  }
  c.activePct = c.total - c.setAside > 0 ? Math.round((c.done / (c.total - c.setAside)) * 100) : 0;
  return c;
}
const esc = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
const icon = (s) => ({ "Done": "✅", "In progress": "🟡", "Not started": "⬜", "Deferred": "⏸️", "Superseded": "🔁", "Unverified": "❔", "Blocked": "⛔", "Set aside": "⏸️" }[s] ?? "•");

const results = [];
for (const p of products) {
  try {
    const r = await p.load();
    results.push({ ...p, ...r, ok: true });
    console.log(`${p.name}: ${r.groups.reduce((n, g) => n + g.stories.length, 0)} stories in ${r.groups.length} groups`);
  } catch (err) {
    results.push({ ...p, ok: false, error: err.message });
    console.error(`${p.name}: FAILED — ${err.message}`);
  }
}
const okResults = results.filter((r) => r.ok);
if (okResults.length === 0) { console.error("Nothing parsed; docs/progress.md left untouched."); process.exit(1); }

const today = new Date().toISOString().slice(0, 10);
const all = okResults.flatMap((r) => r.groups.flatMap((g) => g.stories));
const port = tally(all);
const lines = [];
lines.push("# WonderApps — portfolio progress, story by story");
lines.push("");
lines.push(`<!-- GENERATED by scripts/build-progress-doc.mjs on ${today}. Do not edit by hand: run \`npm run progress\`. -->`);
lines.push("");
lines.push("Every tracked story from every Wonder product, read from each repository's own tracking documents. The live, visual version is at [/appstracker](https://wonderapps.biz/appstracker).");
lines.push("");
lines.push("**Set aside** means deliberately deferred or superseded by later work — not abandoned and not a gap — and is excluded from *active completion* (done ÷ everything still in scope).");
lines.push("");
/* ---------- needs your attention ------------------------------------------ */
// Deterministic: status-driven buckets first, then open stories whose own note says
// they are waiting on a decision, an operator step, or an environment only you can provide.
const WAITING = /user (direction|approval|decision)|user explicitly chose|pending (explicit )?user direction|open (product )?question|operator[- ]step|stopped and recorded|(real|live)[- ]?(end-to-end )?IdP|physical authenticator|not (yet )?verified in this sandbox|needs? (a |an )?(non-sandboxed|real) environment|upgrades? the plan|records interest only|not connected;|needs (a )?(Google Cloud|provider) (OAuth|config)|custom SMTP/i;
const withProduct = okResults.flatMap((r) => r.groups.flatMap((g) => g.stories.map((s) => ({ ...s, product: r.name, group: g.name }))));
const attention = [
  { title: "Blocked — needs a decision or an external unblock", items: withProduct.filter((s) => s.status === "Blocked") },
  { title: "Waiting on you — the tracker's own note says so", items: withProduct.filter((s) => s.status !== "Done" && !["Blocked", "Deferred", "Unverified", "Superseded"].includes(s.status) && WAITING.test(s.note)) },
  { title: "Deferred — a recorded decision to revisit", items: withProduct.filter((s) => s.status === "Deferred") },
  { title: "Unverified — written about, but no code cites it; confirm before relying on it", items: withProduct.filter((s) => s.status === "Unverified") },
];
const attentionTotal = attention.reduce((n, a) => n + a.items.length, 0);
lines.push(`## Needs your attention (${attentionTotal})`);
lines.push("");
lines.push("Derived from the trackers on every regeneration: nothing here is hand-curated, so an item leaves this list only when its source tracker changes.");
lines.push("");
for (const a of attention) {
  if (a.items.length === 0) continue;
  lines.push(`### ${a.title} (${a.items.length})`);
  lines.push("");
  lines.push("| Product | ID | Story | Where | Note |");
  lines.push("|---|---|---|---|---|");
  for (const s of a.items) lines.push(`| ${s.product} | \`${esc(s.id)}\` | ${esc(s.story)} | ${esc(s.group)} | ${esc(s.note)} |`);
  lines.push("");
}
if (attentionTotal === 0) lines.push("Nothing right now.", "");

lines.push("## Portfolio");
lines.push("");
lines.push("| Product | Stories | Done | In progress | Not started | Set aside | Active completion | Tracker updated |");
lines.push("|---|---:|---:|---:|---:|---:|---:|---|");
for (const r of okResults) {
  const c = tally(r.groups.flatMap((g) => g.stories));
  lines.push(`| [${r.name}](#${r.slug}) | ${c.total} | ${c.done} | ${c.inProgress} | ${c.notStarted} | ${c.setAside} | **${c.activePct}%** | ${r.updated ?? "see source"} |`);
}
lines.push(`| **All four** | **${port.total}** | **${port.done}** | **${port.inProgress}** | **${port.notStarted}** | **${port.setAside}** | **${port.activePct}%** | ${today} |`);
for (const r of results.filter((x) => !x.ok)) lines.push(`| ${r.name} | — | — | — | — | — | — | ⚠️ not fetched: ${esc(r.error)} |`);
lines.push("");
// Anything outside the five columns (e.g. Blocked) is still a story: say so rather than let the row not add up.
const residual = new Map();
for (const s of all) if (!["Done", "In progress", "Not started", "Unverified"].includes(s.status) && !ACTIVE_EXCLUDED.has(s.status)) residual.set(s.status, (residual.get(s.status) ?? 0) + 1);
if (residual.size) lines.push(`Not in the columns above but counted in *Stories*: ${[...residual].map(([k, n]) => `${n} ${k.toLowerCase()}`).join(", ")}. "Not started" includes unverified stories (written about, not yet cited by code).`, "");

for (const r of okResults) {
  const c = tally(r.groups.flatMap((g) => g.stories));
  lines.push(`## ${r.name}`);
  lines.push("");
  lines.push(`<a id="${r.slug}"></a>`);
  lines.push("");
  lines.push(`**${c.done} of ${c.total - c.setAside} active stories done (${c.activePct}%)** · ${c.inProgress} in progress · ${c.notStarted} not started${c.setAside ? ` · ${c.setAside} set aside` : ""}. Source: ${r.sources.map((s) => `[\`${s}\`](https://github.com/luvchakra/${r.repo}/blob/main/${s.replace("*.md", "")})`).join(", ")}${r.updated ? ` · tracker updated ${r.updated}` : ""}.`);
  lines.push("");
  lines.push(`| ${r.groupLabel} | Stories | Done | In progress | Not started | Set aside | Active % |`);
  lines.push("|---|---:|---:|---:|---:|---:|---:|");
  for (const g of r.groups) {
    const gc = tally(g.stories);
    lines.push(`| ${esc(g.name)} | ${gc.total} | ${gc.done} | ${gc.inProgress} | ${gc.notStarted} | ${gc.setAside} | ${gc.activePct}% |`);
  }
  lines.push("");
  for (const g of r.groups) {
    lines.push(`### ${esc(g.name)}`);
    lines.push("");
    lines.push("| ID | Story | Status | Notes |");
    lines.push("|---|---|---|---|");
    for (const s of g.stories) lines.push(`| \`${esc(s.id)}\` | ${esc(s.story)} | ${icon(s.status)} ${s.status} | ${esc(s.note)} |`);
    lines.push("");
  }
}

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, lines.join("\n") + "\n");
console.log(`\nWrote ${path.relative(process.cwd(), OUT)}: ${port.total} stories, ${port.done} done, ${port.activePct}% active completion.`);
