import { deckCopy } from "./deck-copy";
import { site } from "./site";
import { startupBySlug } from "./startups";
import type { MarketFigure, Plan, Screenshot, Startup } from "./types";

/**
 * One slide model feeds both the on-page viewer and the printable route that
 * becomes the downloadable PDF. Slides are derived from the same records as the
 * rest of the site (market figures, traction, plans and roadmap are read, never
 * retyped), so a deck cannot quote a number the page doesn't.
 */
export type Slide =
  | { kind: "cover" }
  | { kind: "list"; eyebrow: string; title: string; items: string[] }
  | { kind: "cards"; eyebrow: string; title: string; items: { title: string; body: string }[] }
  | { kind: "steps"; eyebrow: string; title: string; items: { step: string; body: string }[] }
  | { kind: "product"; eyebrow: string; title: string; desktop: Screenshot; mobile?: Screenshot }
  | { kind: "gallery"; eyebrow: string; title: string; shots: Screenshot[] }
  | { kind: "figures"; eyebrow: string; title: string; figures: MarketFigure[]; page: string }
  | { kind: "whynow"; eyebrow: string; title: string; items: string[]; segments: string[] }
  | { kind: "plans"; eyebrow: string; title: string; lede: string; plans: Plan[] }
  | { kind: "traction"; eyebrow: string; title: string; items: { label: string; value: string; note?: string }[] }
  | { kind: "roadmap"; eyebrow: string; title: string; columns: { horizon: string; items: string[] }[] }
  | { kind: "ask"; eyebrow: string; title: string }
  | { kind: "sources"; eyebrow: string; title: string; figures: MarketFigure[] };

export type Deck = { slug: string; startup: Startup; slides: Slide[]; file: string; fileName: string };

const chunk = <T,>(xs: T[], n: number): T[][] => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

export function deckFile(slug: string) {
  return `/decks/${slug}-investor-deck.pdf`;
}

export function buildDeck(s: Startup): Deck {
  const copy = deckCopy[s.slug];
  if (!copy) throw new Error(`No deck copy for ${s.slug}`);
  const desktops = s.screens.filter((x) => x.kind === "desktop");
  const mobiles = s.screens.filter((x) => x.kind === "mobile");
  const slides: Slide[] = [{ kind: "cover" }];

  slides.push({ kind: "list", eyebrow: "The problem", title: s.problem.title, items: copy.problem });
  slides.push({ kind: "cards", eyebrow: "The product", title: s.solution.title, items: copy.solution });
  slides.push({ kind: "product", eyebrow: "In the product", title: `${s.name}, live today`, desktop: desktops[0], mobile: mobiles[0] });
  const inside = [desktops[1], desktops[2]].filter(Boolean) as Screenshot[];
  if (inside.length >= 2) slides.push({ kind: "gallery", eyebrow: "In the product", title: "A closer look", shots: inside });
  slides.push({ kind: "steps", eyebrow: "How it works", title: "From first touch to outcome", items: copy.how });

  const pages = chunk(s.market.figures, 3);
  pages.forEach((figures, i) => {
    slides.push({ kind: "figures", eyebrow: "The market", title: i === 0 ? s.market.title : "More on the opportunity", figures, page: pages.length > 1 ? `${i + 1} of ${pages.length}` : "" });
  });
  slides.push({ kind: "whynow", eyebrow: "Why now", title: "What has changed", items: s.market.whyNow, segments: s.market.segments });
  slides.push({ kind: "plans", eyebrow: "Business model", title: s.businessModel.title, lede: s.businessModel.lede, plans: s.businessModel.plans });
  slides.push({ kind: "traction", eyebrow: "Execution to date", title: "Built and verifiable", items: s.traction });
  slides.push({ kind: "cards", eyebrow: "Defensibility", title: "What compounds", items: copy.moat });
  slides.push({ kind: "roadmap", eyebrow: "Roadmap", title: "What comes next", columns: s.roadmap });
  slides.push({ kind: "ask", eyebrow: "The ask", title: s.ask });
  if (s.market.figures.length) slides.push({ kind: "sources", eyebrow: "Appendix", title: "Sources for every market figure", figures: s.market.figures });

  return { slug: s.slug, startup: s, slides, file: deckFile(s.slug), fileName: `${s.name.replace(/\s+/g, "")}-Investor-Deck.pdf` };
}

export function deckBySlug(slug: string): Deck | undefined {
  const s = startupBySlug(slug);
  return s ? buildDeck(s) : undefined;
}

export const deckFooter = (s: Startup) => `WonderApps · ${s.name} · Investor overview · Not an offer of securities · ${site.contactEmail}`;
