import { totalsFor, type PortfolioTotals } from "@/content/progress";
import { getLatestProgress } from "@/lib/content/load";
import { TRACKER_SOURCES } from "@/lib/tracker-parsers";

/**
 * Development progress per product, read live from each product's own public progress files on
 * GitHub (the same files the public /appstracker parses), with a five-minute in-memory cache. If
 * a file can't be read the section says so and falls back to the latest recorded snapshot in the
 * database; if that can't be read either it shows no numbers at all, never zeros.
 */

const GH = "https://github.com/luvchakra";
const RAW = "https://raw.githubusercontent.com/luvchakra";

export type DevDoc = { label: string; repo: string; path: string };

/** Which files make up each product's development section, in reading order. */
export const DEV_SOURCES: Record<string, { repo: string; docs: DevDoc[] }> = {
  wonderhome: {
    repo: "wonder-home",
    docs: [
      { label: "Where the whole application stands", repo: "wonder-home", path: "docs/PROGRESS.md" },
      { label: "Live progress log", repo: "wonder-home", path: "tracking/PROGRESS.md" },
    ],
  },
  wonderjobs: {
    repo: "wonder-jobs",
    docs: [
      { label: "Progress by epic", repo: "wonder-jobs", path: "docs/PROGRESS.md" },
      { label: "Implementation tracker (every requirement)", repo: "wonder-jobs", path: "docs/IMPLEMENTATION_TRACKER.md" },
    ],
  },
  wondercreator: {
    repo: "wonder-creator",
    docs: [{ label: "Progress by capability", repo: "wonder-creator", path: "docs/progress.md" }],
  },
  wonderark: {
    repo: "founder-collab",
    docs: [{ label: "Progress tracker (every backlog)", repo: "founder-collab", path: "docs/PROGRESS-TRACKER.md" }],
  },
  wonderid: {
    repo: "wonder-agent",
    docs: [
      { label: "IGA and Agent ID: live progress", repo: "wonder-agent", path: "docs/WonderID/progress/PROGRESS.md" },
      { label: "Programme rollup (every module)", repo: "wonder-agent", path: "docs/PROGRESS.md" },
    ],
  },
};

export const rawUrl = (d: DevDoc) => `${RAW}/${d.repo}/main/${d.path}`;
export const blobUrl = (d: DevDoc) => `${GH}/${d.repo}/blob/main/${d.path}`;

const TTL_MS = 5 * 60_000;
const cache = new Map<string, { at: number; text: string }>();

async function fetchText(url: string): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) return { ok: true, text: hit.text };
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!res.ok) return { ok: false, error: `GitHub returned ${res.status}` };
    const text = await res.text();
    cache.set(url, { at: Date.now(), text });
    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 160) : "fetch failed" };
  }
}

export type Fact = { label: string; value: string };

const FACT_KEYS = /last updated|current|next|phase/i;

/** A headline, not a changelog: the latest entry only (logs append "Earlier — …"), trimmed for a card. */
export function brief(text: string, max = 240): string {
  const latest = text.split(/\s+Earlier(?:\s+(?:the same day|—|-|:))/)[0].trim();
  return latest.length > max ? `${latest.slice(0, max - 1).trimEnd()}…` : latest;
}

/**
 * The short key/value table some trackers open with (WonderID's "Current phase / Next story",
 * WonderHome's "Current module / Current story"). Only the first two-column table near the top,
 * only the rows worth a headline, values trimmed for a card.
 */
export function keyFacts(md: string): Fact[] {
  const lines = md.split("\n").slice(0, 80);
  const out: Fact[] = [];
  let inTable = false;
  for (const line of lines) {
    const t = line.trim();
    if (!t.startsWith("|")) {
      if (inTable && out.length) break;
      inTable = false;
      continue;
    }
    const cells = t.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
    if (cells.length !== 2) {
      if (inTable && out.length) break;
      continue;
    }
    inTable = true;
    const [k, v] = cells;
    if (!k || /^:?-+:?$/.test(k) || /^(metric|key)$/i.test(k) || !FACT_KEYS.test(k)) continue;
    const value = v.replace(/`/g, "").replace(/\*\*/g, "");
    out.push({ label: k, value: brief(value) });
  }
  return out;
}

export type DevSection = {
  slug: string;
  /** Null only when neither the live file nor a recorded snapshot could be read. */
  totals: PortfolioTotals | null;
  /** True when the numbers came from the live file; false means the latest recorded snapshot. */
  live: boolean;
  lastUpdated: string | null;
  currentFocus: string | null;
  facts: Fact[];
  docs: { doc: DevDoc; markdown: string | null; error: string | null }[];
};

export async function loadDevSection(slug: string): Promise<DevSection | null> {
  const src = DEV_SOURCES[slug];
  if (!src) return null;
  const docs = await Promise.all(
    src.docs.map(async (doc) => {
      const r = await fetchText(rawUrl(doc));
      return { doc, markdown: r.ok ? r.text : null, error: r.ok ? null : r.error };
    }),
  );

  // Numbers: the same parser and file as the public tracker, so the two never disagree.
  const tracker = TRACKER_SOURCES[slug];
  const recorded = await getLatestProgress()
    .then((m) => m.get(slug) ?? null)
    .catch(() => null);
  let totals: PortfolioTotals | null = recorded?.rows.length ? totalsFor(recorded.rows) : null;
  let live = false;
  let lastUpdated: string | null = recorded ? (recorded.snapshot.source_last_updated ?? recorded.snapshot.captured_on) : null;
  let currentFocus: string | null = recorded?.snapshot.current_focus ?? null;
  if (tracker) {
    const r = await fetchText(tracker.raw);
    if (r.ok) {
      try {
        const parsed = tracker.parse(r.text);
        totals = totalsFor(parsed.rows);
        live = true;
        lastUpdated = parsed.lastUpdated ?? lastUpdated;
        currentFocus = parsed.currentFocus ?? currentFocus;
      } catch {
        // A layout change in the product's file: keep the snapshot numbers, never zeros.
      }
    }
  }

  const facts = docs.flatMap((d) => (d.markdown ? keyFacts(d.markdown) : []));
  const updatedFact = facts.find((f) => /last updated/i.test(f.label));
  if (updatedFact && (!lastUpdated || updatedFact.value > lastUpdated)) lastUpdated = updatedFact.value.slice(0, 10);

  return {
    slug,
    totals,
    live,
    lastUpdated,
    currentFocus: currentFocus ? brief(currentFocus) : null,
    facts: facts.filter((f) => !/last updated/i.test(f.label)),
    docs,
  };
}
