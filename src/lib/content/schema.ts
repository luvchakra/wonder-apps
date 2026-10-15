import { z } from "zod";

/**
 * The shape of every document in `public.content_documents`. The site's copy is edited in the
 * database, so nothing is trusted on the way in: a document that doesn't match its schema
 * throws, which fails the build or (at runtime) keeps the last good page instead of rendering
 * a broken one.
 */

const text = z.string().min(1);

export const ScreenshotSchema = z.object({
  src: text,
  alt: text,
  kind: z.enum(["desktop", "mobile"]),
  caption: z.string().optional(),
});

export const PlanSchema = z.object({
  name: text,
  tagline: z.string(),
  bullets: z.array(z.string()),
  featured: z.boolean().optional(),
});

/** One third-party number, shown with the publisher and a link anyone can check. */
export const MarketFigureSchema = z.object({
  figure: text,
  label: text,
  detail: z.string().optional(),
  source: z.object({ publisher: text, title: text, url: z.url(), year: text }),
  note: z.string().optional(),
});

/**
 * A traction item. With `live: true` its value and note are templates filled from the
 * product's latest tracker snapshot ({done}, {total}, {pct}, {rows}, {rowsDone}, …), so the
 * number on the page is always the one the tracker shows.
 */
export const TractionItemSchema = z.object({
  label: text,
  value: text,
  note: z.string().optional(),
  live: z.boolean().optional(),
});

export const StartupSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: text,
  tagline: text,
  oneLiner: text,
  category: text,
  audience: text,
  geography: text,
  stage: text,
  url: z.url(),
  helpUrl: z.url().optional(),
  accent: text,
  accentSoft: text,
  logo: z.object({ light: text, dark: text, mark: z.string().optional() }).optional(),
  hero: z.object({ headline: text, sub: text }),
  problem: z.object({ title: text, lede: text, points: z.array(z.object({ title: text, body: text })) }),
  solution: z.object({ title: text, lede: text, pillars: z.array(z.object({ title: text, body: text })) }),
  howItWorks: z.array(z.object({ step: text, body: text })),
  screens: z.array(ScreenshotSchema),
  market: z.object({
    title: text,
    lede: text,
    segments: z.array(z.string()),
    whyNow: z.array(z.string()),
    figures: z.array(MarketFigureSchema),
  }),
  businessModel: z.object({ title: text, lede: text, plans: z.array(PlanSchema) }),
  moat: z.array(z.object({ title: text, body: text })),
  traction: z.array(TractionItemSchema),
  roadmap: z.array(z.object({ horizon: text, items: z.array(z.string()) })),
  ask: text,
  facts: z.array(z.object({ label: text, value: text })),
});

/** Short-form copy for the pitch deck, where a slide holds a line, not a paragraph. */
export const DeckCopySchema = z.object({
  problem: z.array(z.string()),
  solution: z.array(z.object({ title: text, body: text })),
  how: z.array(z.object({ step: text, body: text })),
  moat: z.array(z.object({ title: text, body: text })),
});

/** Legal text may use {{url}}, {{contactPath}}, {{contactEmail}}, {{legalName}}, {{jurisdiction}}, {{lastUpdated}}. */
export const LegalDocSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: text,
  summary: text,
  sections: z.array(z.object({ heading: text, paragraphs: z.array(z.string()), bullets: z.array(z.string()).optional() })),
});

/** The site-wide copy. Name, address, contact email and navigation are configuration and stay in code. */
export const SiteCopySchema = z.object({
  tagline: text,
  positioning: text,
  description: text,
  jurisdiction: text,
  lastUpdated: text,
});

/** How the tracker presents a product. The numbers themselves come from progress snapshots. */
export const TrackerMetaSchema = z.object({
  name: text,
  accent: text,
  stage: text,
  currentFocus: text,
  sourceLabel: text,
  sourceUrl: z.url(),
  rowLabel: text,
  methodology: text,
  /** Editorial notes per tracker row id, shown while that row still exists. */
  notes: z.record(z.string(), z.string()),
});

export type Screenshot = z.infer<typeof ScreenshotSchema>;
export type ShotKind = Screenshot["kind"];
export type Plan = z.infer<typeof PlanSchema>;
export type MarketFigure = z.infer<typeof MarketFigureSchema>;
export type TractionItem = z.infer<typeof TractionItemSchema>;
export type Startup = z.infer<typeof StartupSchema>;
export type DeckCopy = z.infer<typeof DeckCopySchema>;
export type LegalDoc = z.infer<typeof LegalDocSchema>;
export type LegalSection = LegalDoc["sections"][number];
export type SiteCopy = z.infer<typeof SiteCopySchema>;
export type TrackerMeta = z.infer<typeof TrackerMetaSchema>;
