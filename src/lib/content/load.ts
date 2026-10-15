import { cache } from "react";
import { z } from "zod";
import { buildDeck, type Deck } from "@/content/decks";
import { site } from "@/content/site";
import { fillTemplate, tractionVars, type ProductProgress, type ProgressRow } from "@/content/progress";
import { CONTENT_REVALIDATE, restGet } from "./supabase";
import {
  DeckCopySchema,
  LegalDocSchema,
  SiteCopySchema,
  StartupSchema,
  TrackerMetaSchema,
  type DeckCopy,
  type LegalDoc,
  type SiteCopy,
  type Startup,
  type TrackerMeta,
} from "./schema";

/**
 * Everything the site says is read from here. Copy comes from `content_documents`, numbers from
 * `progress_snapshots`; both are cached for CONTENT_REVALIDATE seconds, so an edit in the
 * database shows on the site within five minutes without a deployment. A read or validation
 * failure throws: the build fails, or at runtime the last good page keeps being served.
 */

const CONTENT = { revalidate: CONTENT_REVALIDATE, tags: ["content"] };
const PROGRESS = { revalidate: CONTENT_REVALIDATE, tags: ["progress"] };

type Kind = "site" | "startup" | "deck_copy" | "legal" | "tracker";
type DocRow = { slug: string; data: unknown };

const docsOf = cache(async (kind: Kind) =>
  restGet<DocRow[]>(`content_documents?select=slug,data&kind=eq.${kind}&order=position.asc,slug.asc`, CONTENT),
);

function parseAll<S extends z.ZodType>(kind: Kind, schema: S, rows: DocRow[]): { slug: string; data: z.infer<S> }[] {
  return rows.map((r) => {
    const parsed = schema.safeParse(r.data);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new Error(`Content ${kind}/${r.slug} is invalid at ${issue?.path.join(".") || "(root)"}: ${issue?.message}`);
    }
    return { slug: r.slug, data: parsed.data };
  });
}

/* ---------------------------------------------------------------- progress */

export type Snapshot = {
  id: number;
  product_slug: string;
  captured_on: string;
  source: "live" | "backfill";
  source_last_updated: string | null;
  current_focus: string | null;
  total: number;
  done: number;
  partial: number;
  not_started: number;
  set_aside: number;
};

type SnapshotRowDb = {
  snapshot_id: number;
  position: number;
  row_id: string;
  name: string;
  total: number;
  done: number;
  partial: number;
  not_started: number;
  set_aside: number;
  status: string;
  note: string | null;
};

const SNAPSHOT_COLS = "id,product_slug,captured_on,source,source_last_updated,current_focus,total,done,partial,not_started,set_aside";

const toRow = (r: SnapshotRowDb): ProgressRow => ({
  id: r.row_id,
  name: r.name,
  total: r.total,
  done: r.done,
  partial: r.partial,
  notStarted: r.not_started,
  setAside: r.set_aside,
  status: r.status,
  ...(r.note ? { note: r.note } : {}),
});

async function rowsFor(ids: number[]): Promise<Map<number, ProgressRow[]>> {
  const out = new Map<number, ProgressRow[]>();
  if (!ids.length) return out;
  const rows = await restGet<SnapshotRowDb[]>(
    `progress_snapshot_rows?select=*&snapshot_id=in.(${ids.join(",")})&order=snapshot_id.asc,position.asc`,
    PROGRESS,
  );
  for (const r of rows) {
    const list = out.get(r.snapshot_id) ?? [];
    list.push(toRow(r));
    out.set(r.snapshot_id, list);
  }
  return out;
}

/** Each product's most recent snapshot with its rows, keyed by product slug. */
export const getLatestProgress = cache(async (): Promise<Map<string, { snapshot: Snapshot; rows: ProgressRow[] }>> => {
  const latest = await restGet<Snapshot[]>(`progress_latest?select=${SNAPSHOT_COLS}`, PROGRESS);
  const rows = await rowsFor(latest.map((s) => s.id));
  return new Map(latest.map((s) => [s.product_slug, { snapshot: s, rows: rows.get(s.id) ?? [] }]));
});

/** Every snapshot's totals, oldest first: the series behind the trend charts. */
export const getProgressHistory = cache(async (): Promise<Snapshot[]> =>
  restGet<Snapshot[]>(`progress_snapshots?select=${SNAPSHOT_COLS}&order=captured_on.asc,product_slug.asc`, PROGRESS),
);

/** One product's snapshots with their rows, oldest first: the per-module trend. */
export const getProductHistory = cache(async (slug: string): Promise<{ snapshot: Snapshot; rows: ProgressRow[] }[]> => {
  const snaps = await restGet<Snapshot[]>(
    `progress_snapshots?select=${SNAPSHOT_COLS}&product_slug=eq.${encodeURIComponent(slug)}&order=captured_on.asc`,
    PROGRESS,
  );
  const rows = await rowsFor(snaps.map((s) => s.id));
  return snaps.map((s) => ({ snapshot: s, rows: rows.get(s.id) ?? [] }));
});

/* ---------------------------------------------------------------- copy */

export const getSiteCopy = cache(async (): Promise<SiteCopy> => {
  const [main] = parseAll("site", SiteCopySchema, (await docsOf("site")).filter((d) => d.slug === "main"));
  if (!main) throw new Error("Content site/main is missing.");
  return main.data;
});

/**
 * The five startups in display order. Live traction items are filled from the product's latest
 * snapshot; one whose product has no snapshot yet is left out rather than shown as a template.
 */
export const getStartups = cache(async (): Promise<Startup[]> => {
  const [docs, latest] = await Promise.all([docsOf("startup"), getLatestProgress()]);
  return parseAll("startup", StartupSchema, docs).map(({ data: s }) => {
    const rows = latest.get(s.slug)?.rows;
    const vars = rows?.length ? tractionVars(rows) : null;
    const traction = s.traction.flatMap((t) => {
      if (!t.live) return [t];
      if (!vars) return [];
      return [{ label: t.label, value: fillTemplate(t.value, vars), ...(t.note ? { note: fillTemplate(t.note, vars) } : {}) }];
    });
    return { ...s, traction };
  });
});

export async function getStartup(slug: string): Promise<Startup | undefined> {
  return (await getStartups()).find((s) => s.slug === slug);
}

export const getDeckCopy = cache(async (): Promise<Record<string, DeckCopy>> =>
  Object.fromEntries(parseAll("deck_copy", DeckCopySchema, await docsOf("deck_copy")).map((d) => [d.slug, d.data])),
);

/** A startup's deck, built from its record and its deck copy. */
export async function getDeck(slug: string): Promise<Deck | undefined> {
  const [s, copies] = await Promise.all([getStartup(slug), getDeckCopy()]);
  if (!s) return undefined;
  const copy = copies[slug];
  if (!copy) throw new Error(`Content deck_copy/${slug} is missing.`);
  return buildDeck(s, copy);
}

/** Legal pages with {{url}}, {{contactEmail}}, … filled from the site configuration and copy. */
export const getLegalDocs = cache(async (): Promise<LegalDoc[]> => {
  const [docs, copy] = await Promise.all([docsOf("legal"), getSiteCopy()]);
  const vars: Record<string, string> = {
    url: site.url,
    contactPath: site.contactPath,
    contactEmail: site.contactEmail,
    legalName: site.legalName,
    jurisdiction: copy.jurisdiction,
    lastUpdated: copy.lastUpdated,
  };
  const fill = (t: string) =>
    t.replace(/\{\{(\w+)\}\}/g, (_, k: string) => {
      if (!(k in vars)) throw new Error(`Unknown placeholder {{${k}}} in legal text`);
      return vars[k];
    });
  return parseAll("legal", LegalDocSchema, docs).map(({ data: d }) => ({
    ...d,
    summary: fill(d.summary),
    sections: d.sections.map((sec) => ({
      heading: fill(sec.heading),
      paragraphs: sec.paragraphs.map(fill),
      ...(sec.bullets ? { bullets: sec.bullets.map(fill) } : {}),
    })),
  }));
});

export async function getLegalDoc(slug: string): Promise<LegalDoc | undefined> {
  return (await getLegalDocs()).find((d) => d.slug === slug);
}

export const getTrackerMeta = cache(async (): Promise<{ slug: string; meta: TrackerMeta }[]> =>
  parseAll("tracker", TrackerMetaSchema, await docsOf("tracker")).map((d) => ({ slug: d.slug, meta: d.data })),
);

/**
 * What /appstracker renders before its live refresh: each product's description joined to its
 * latest snapshot. A product with no snapshot throws instead of rendering zeros.
 */
export const getTrackerProducts = cache(async (): Promise<ProductProgress[]> => {
  const [metas, latest] = await Promise.all([getTrackerMeta(), getLatestProgress()]);
  return metas.map(({ slug, meta }) => {
    const l = latest.get(slug);
    if (!l?.rows.length) throw new Error(`No progress snapshot for ${slug}; run the progress recorder first.`);
    return {
      slug,
      name: meta.name,
      accent: meta.accent,
      stage: meta.stage,
      currentFocus: l.snapshot.current_focus ?? meta.currentFocus,
      lastUpdated: l.snapshot.source_last_updated ?? l.snapshot.captured_on,
      sourceLabel: meta.sourceLabel,
      sourceUrl: meta.sourceUrl,
      rowLabel: meta.rowLabel,
      methodology: meta.methodology,
      rows: l.rows.map((r) => ({ ...r, ...(r.note ? {} : meta.notes[r.id] ? { note: meta.notes[r.id] } : {}) })),
    };
  });
});
