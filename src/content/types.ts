export type ShotKind = "desktop" | "mobile";

export type Screenshot = {
  src: string;
  alt: string;
  kind: ShotKind;
  caption?: string;
};

export type Plan = {
  name: string;
  tagline: string;
  bullets: string[];
  featured?: boolean;
};

/** One third-party number, shown with the publisher and a link anyone can check. */
export type MarketFigure = {
  /** Display value, e.g. "$480B". */
  figure: string;
  /** What it measures, in plain words. */
  label: string;
  /** One investor-facing sentence of context. */
  detail?: string;
  source: { publisher: string; title: string; url: string; year: string };
  /** Caveat such as "forecast, base year 2024" or a definition. */
  note?: string;
};

/** Short-form copy for the pitch deck, where a slide holds a line, not a paragraph. */
export type DeckCopy = {
  problem: string[];
  solution: { title: string; body: string }[];
  how: { step: string; body: string }[];
  moat: { title: string; body: string }[];
};

export type Startup = {
  slug: string;
  name: string;
  /** Short brand line, as the product itself uses it. */
  tagline: string;
  /** One sentence an investor can repeat in a partner meeting. */
  oneLiner: string;
  category: string;
  audience: string;
  geography: string;
  stage: string;
  url: string;
  /** The product's own help centre, when it has one. */
  helpUrl?: string;
  /** Brand accent as OKLCH so it holds up in both themes. */
  accent: string;
  accentSoft: string;
  /** Logo lockups, when the product ships raster ones. */
  logo?: { light: string; dark: string; mark?: string };
  hero: { headline: string; sub: string };
  problem: { title: string; lede: string; points: { title: string; body: string }[] };
  solution: { title: string; lede: string; pillars: { title: string; body: string }[] };
  howItWorks: { step: string; body: string }[];
  screens: Screenshot[];
  market: { title: string; lede: string; segments: string[]; whyNow: string[]; figures: MarketFigure[] };
  businessModel: { title: string; lede: string; plans: Plan[] };
  moat: { title: string; body: string }[];
  /** Verifiable build/execution facts pulled from the product's own trackers. */
  traction: { label: string; value: string; note?: string }[];
  roadmap: { horizon: string; items: string[] }[];
  ask: string;
  facts: { label: string; value: string }[];
};
