import type { ProgressRow } from "@/content/progress";

/**
 * Deterministic markdown-table parsers for each product's own live tracker.
 * No LLM involved — a table is found by its exact header cells (robust to
 * the doc growing elsewhere) and parsed with plain string splitting. If a
 * table or field isn't found, the parser throws and the caller keeps
 * whatever data it already had rather than showing wrong numbers.
 */

export type ParsedTracker = {
  rows: ProgressRow[];
  lastUpdated: string | null;
  currentFocus: string | null;
};

function splitRow(line: string): string[] {
  const inner = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return inner.split("|").map((c) => c.trim());
}

function stripLink(s: string): { text: string; href: string | null } {
  const m = s.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  return m ? { text: m[1], href: m[2] } : { text: s, href: null };
}

/** Locates a table by its header cells (order-sensitive, whitespace-insensitive) and returns its data rows. */
function findTable(md: string, headerCells: string[]): string[][] | null {
  const lines = md.split("\n");
  const norm = (s: string) => s.replace(/\s+/g, "");
  const needle = norm("|" + headerCells.join("|") + "|");
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (norm(lines[i]).startsWith(needle)) {
      start = i;
      break;
    }
  }
  if (start === -1 || !/^\|?\s*:?-{2,}/.test(lines[start + 1] ?? "")) return null;
  const rows: string[][] = [];
  for (let i = start + 2; i < lines.length; i++) {
    if (!lines[i].trim().startsWith("|")) break;
    rows.push(splitRow(lines[i]));
  }
  return rows;
}

function need<T>(v: T | null | undefined, what: string): T {
  if (v === null || v === undefined) throw new Error(`tracker parse: ${what} not found`);
  return v;
}

export function parseWonderHome(md: string): ParsedTracker {
  const table = need(findTable(md, ["#", "Module", "Stories", "P0", "P1", "P2", "Done", "Status"]), "wonderhome module table");
  if (table.length === 0) throw new Error("wonderhome: module table matched but had no rows");
  const rows: ProgressRow[] = table.map((c) => {
    const [id, name, total, , , , done, status] = c;
    const t = Number(total);
    const d = Number(done);
    if (!Number.isFinite(t) || !Number.isFinite(d)) throw new Error(`wonderhome: non-numeric row for ${id}`);
    return { id, name, total: t, done: d, partial: 0, notStarted: t - d, setAside: 0, status };
  });
  const lastUpdated = md.match(/\|\s*Last updated\s*\|\s*([\d-]+)\s*\|/)?.[1] ?? null;
  const currentModule = md.match(/\|\s*Current module\s*\|\s*([^|]+?)\s*\|/)?.[1] ?? null;
  const currentStory = md.match(/\|\s*Current story\s*\|\s*([^|]+?)\s*\|/)?.[1] ?? null;
  return { rows, lastUpdated, currentFocus: currentModule ? `Module ${currentModule}${currentStory ? ` — ${currentStory}` : ""}` : null };
}

export function parseWonderJobs(md: string): ParsedTracker {
  const table = need(findTable(md, ["Epic", "Done", "Partial", "Backlog", "Status"]), "wonderjobs at-a-glance table");
  if (table.length === 0) throw new Error("wonderjobs: at-a-glance table matched but had no rows");
  const rows: ProgressRow[] = table.map((c) => {
    const [epic, done, partial, backlog, statusRaw] = c;
    const idMatch = epic.match(/^(\d+)\.\s*(.+)$/);
    const id = idMatch ? idMatch[1] : epic;
    const name = idMatch ? idMatch[2] : epic;
    let status = "In Progress";
    if (statusRaw.startsWith("✅")) status = "Done";
    else if (statusRaw.startsWith("⬜")) status = "Backlog";
    else if (statusRaw.startsWith("⛔")) status = "Blocked";
    const note = statusRaw.replace(/^[✅🟡⬜⛔]\s*/u, "").trim();
    const d = Number(done);
    const p = Number(partial);
    const b = Number(backlog);
    if (![d, p, b].every(Number.isFinite)) throw new Error(`wonderjobs: non-numeric row for ${epic}`);
    return { id, name, total: d + p + b, done: d, partial: p, notStarted: b, setAside: 0, status, note: note || undefined };
  });
  const lu = md.match(/^_Last updated:\s*([\d-]+)\s*—\s*(.+?)_\s*$/m);
  return { rows, lastUpdated: lu?.[1] ?? null, currentFocus: lu?.[2]?.replace(/^"|"$/g, "") ?? null };
}

export function parseWonderArk(md: string): ParsedTracker {
  const table = need(findTable(md, ["Backlog", "Done", "Set aside", "Remaining", "Total"]), "wonderark backlog table");
  if (table.length === 0) throw new Error("wonderark: backlog table matched but had no rows");
  const rows: ProgressRow[] = table.map((c, i) => {
    const [backlogLinked, done, setAside, , total] = c;
    const { text: name, href } = stripLink(backlogLinked);
    const idMatch = href?.match(/(\d+)-[A-Za-z-]+\.md/);
    const id = idMatch ? idMatch[1] : String(i + 1);
    const d = Number(done);
    const sa = Number(setAside);
    const t = Number(total);
    if (![d, sa, t].every(Number.isFinite)) throw new Error(`wonderark: non-numeric row for ${name}`);
    const remaining = t - d - sa;
    return {
      id,
      name,
      total: t,
      done: d,
      partial: 0,
      notStarted: remaining,
      setAside: sa,
      status: sa === t ? "Superseded" : remaining === 0 ? "Done" : "In Progress",
    };
  });
  return { rows, lastUpdated: null, currentFocus: null };
}

export function parseWonderAgent(md: string): ParsedTracker {
  const table = need(findTable(md, ["#", "Agent", "Done", "Partial", "Deferred", "Not Started", "Total", "Progress"]), "wonderagent by-module table");
  if (table.length === 0) throw new Error("wonderagent: by-module table matched but had no rows");
  const rows: ProgressRow[] = table.map((c) => {
    const [id, nameLinked, done, partial, deferred, notStarted, total] = c;
    const { text: nameRaw } = stripLink(nameLinked);
    const d = Number(done);
    const p = Number(partial);
    const def = Number(deferred);
    const ns = Number(notStarted);
    const t = Number(total);
    if (![d, p, def, ns, t].every(Number.isFinite)) throw new Error(`wonderagent: non-numeric row for ${nameRaw}`);
    return { id, name: nameRaw.replace(/\s*Agent$/, ""), total: t, done: d, partial: p, notStarted: ns, setAside: def, status: ns + p === 0 && def === 0 ? "Done" : "In Progress" };
  });
  const gen = md.match(/^Generated\s+([\d-]+)\s+from/m);
  return { rows, lastUpdated: gen?.[1] ?? null, currentFocus: null };
}

export const TRACKER_SOURCES: Record<string, { raw: string; parse: (md: string) => ParsedTracker }> = {
  wonderhome: { raw: "https://raw.githubusercontent.com/luvchakra/wonder-home/main/tracking/PROGRESS.md", parse: parseWonderHome },
  wonderjobs: { raw: "https://raw.githubusercontent.com/luvchakra/wonder-jobs/main/docs/PROGRESS.md", parse: parseWonderJobs },
  wonderark: { raw: "https://raw.githubusercontent.com/luvchakra/founder-collab/main/docs/PROGRESS-TRACKER.md", parse: parseWonderArk },
  wonderagent: { raw: "https://raw.githubusercontent.com/luvchakra/wonder-agent/main/docs/PROGRESS.md", parse: parseWonderAgent },
};
