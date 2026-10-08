/* eslint-disable @next/next/no-img-element -- slides are drawn at a fixed 1920x1080 and must load eagerly so the PDF has every image */
import type { CSSProperties, ReactNode } from "react";
import { deckFooter, type Deck, type Slide } from "@/content/decks";
import { site } from "@/content/site";
import type { MarketFigure, Screenshot, Startup } from "@/content/types";

export const SLIDE_W = 1920;
export const SLIDE_H = 1080;

const ink = "#f5f5f7";
const muted = "#a8a8b0";
const subtle = "#7d7d86";
const rule = "rgba(255,255,255,0.12)";
const panel = "rgba(255,255,255,0.045)";

/* --- primitives ---------------------------------------------------------- */

function Shot({ shot, style }: { shot: Screenshot; style?: CSSProperties }) {
  const phone = shot.kind === "mobile";
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background: "#0d0d12",
        borderRadius: phone ? 46 : 22,
        border: phone ? "10px solid #1b1b22" : `1px solid ${rule}`,
        boxShadow: "0 40px 90px -30px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04)",
        ...style,
      }}
    >
      {!phone ? (
        <div style={{ height: 34, display: "flex", alignItems: "center", gap: 8, padding: "0 16px", background: "#14141a", borderBottom: `1px solid ${rule}` }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <span key={c} style={{ width: 11, height: 11, borderRadius: 99, background: c, opacity: 0.85 }} />
          ))}
        </div>
      ) : null}
      <img src={shot.src} alt={shot.alt} loading="eager" decoding="sync" style={{ display: "block", width: "100%", height: phone ? "100%" : "calc(100% - 34px)", objectFit: "cover", objectPosition: "top" }} />
    </div>
  );
}

function Frame({ s, deck, index, eyebrow, children, glow = 1 }: { s: Startup; deck: Deck; index: number; eyebrow?: string; children: ReactNode; glow?: number }) {
  return (
    <section
      className="theme-dark"
      aria-roledescription="slide"
      aria-label={`${s.name}, slide ${index + 1} of ${deck.slides.length}`}
      style={
        {
          "--accent": s.accent,
          position: "relative",
          width: SLIDE_W,
          height: SLIDE_H,
          overflow: "hidden",
          color: ink,
          fontFamily: "var(--font-sans)",
          background: `radial-gradient(1100px 680px at 88% -8%, color-mix(in oklab, ${s.accent} ${Math.round(34 * glow)}%, transparent), transparent 62%), radial-gradient(900px 620px at -6% 112%, color-mix(in oklab, ${s.accent} ${Math.round(20 * glow)}%, transparent), transparent 58%), #06060a`,
        } as CSSProperties
      }
    >
      <div style={{ position: "absolute", inset: 0, padding: "84px 116px 0" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <p style={{ fontSize: 22, fontWeight: 700, letterSpacing: "0.26em", textTransform: "uppercase", color: s.accent, margin: 0 }}>{eyebrow ?? ""}</p>
          {s.logo ? <img src={s.logo.dark} alt="" loading="eager" style={{ height: 40, width: "auto", opacity: 0.95 }} /> : <p style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.01em", color: ink }}>{s.name}</p>}
        </header>
        <div style={{ position: "relative", height: SLIDE_H - 84 - 56 - 96 }}>{children}</div>
      </div>
      <footer style={{ position: "absolute", left: 116, right: 116, bottom: 38, display: "flex", justifyContent: "space-between", fontSize: 18, color: subtle, borderTop: `1px solid ${rule}`, paddingTop: 18 }}>
        <span>{deckFooter(s)}</span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {index + 1} / {deck.slides.length}
        </span>
      </footer>
    </section>
  );
}

const H = ({ children, size = 66, max = 1400 }: { children: ReactNode; size?: number; max?: number }) => (
  <h2 style={{ margin: "26px 0 0", fontSize: size, lineHeight: 1.06, fontWeight: 700, letterSpacing: "-0.03em", maxWidth: max, textWrap: "balance" }}>{children}</h2>
);

const sourceLine = (f: MarketFigure) => `${f.source.publisher}, ${f.source.year}`;

/* --- slide kinds --------------------------------------------------------- */

function Cover({ s, deck, index }: { s: Startup; deck: Deck; index: number }) {
  const hero = s.screens.find((x) => x.kind === "desktop")!;
  const phone = s.screens.find((x) => x.kind === "mobile");
  return (
    <Frame s={s} deck={deck} index={index} glow={1.35}>
      <div style={{ display: "grid", gridTemplateColumns: "800px 1fr", gap: 70, height: "100%", alignItems: "center" }}>
        <div style={{ marginTop: -30 }}>
          {s.logo ? <img src={s.logo.dark} alt={s.name} loading="eager" style={{ height: 78, width: "auto" }} /> : <p style={{ margin: 0, fontSize: 52, fontWeight: 700, letterSpacing: "-0.03em" }}>{s.name}</p>}
          <p style={{ margin: "40px 0 0", fontSize: 22, fontWeight: 700, letterSpacing: "0.26em", textTransform: "uppercase", color: s.accent }}>{s.category}</p>
          <h1 style={{ margin: "22px 0 0", fontSize: 84, lineHeight: 1.02, fontWeight: 700, letterSpacing: "-0.04em", textWrap: "balance" }}>{s.hero.headline}</h1>
          <p style={{ margin: "30px 0 0", fontSize: 30, lineHeight: 1.4, color: muted, maxWidth: 720 }}>{s.oneLiner}</p>
          <p style={{ margin: "44px 0 0", fontSize: 24, color: ink }}>
            Investor overview <span style={{ color: subtle }}>· {s.stage}</span>
          </p>
        </div>
        <div style={{ position: "relative", height: 640 }}>
          <Shot shot={hero} style={{ position: "absolute", left: 0, top: 20, width: 780, height: 500 }} />
          {phone ? <Shot shot={phone} style={{ position: "absolute", right: 14, top: 150, width: 250, height: 520 }} /> : null}
        </div>
      </div>
    </Frame>
  );
}

function List({ s, deck, index, slide }: { s: Startup; deck: Deck; index: number; slide: Extract<Slide, { kind: "list" }> }) {
  return (
    <Frame s={s} deck={deck} index={index} eyebrow={slide.eyebrow}>
      <div style={{ display: "grid", gridTemplateColumns: "720px 1fr", gap: 100, height: "100%", alignItems: "center" }}>
        <H size={64} max={720}>
          {slide.title}
        </H>
        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 26 }}>
          {slide.items.map((t, i) => (
            <li key={t} style={{ display: "flex", gap: 28, alignItems: "flex-start", padding: "26px 32px", background: panel, border: `1px solid ${rule}`, borderRadius: 24 }}>
              <span style={{ flex: "none", width: 52, height: 52, borderRadius: 99, background: s.accent, color: "#fff", display: "grid", placeItems: "center", fontSize: 26, fontWeight: 700 }}>{i + 1}</span>
              <span style={{ fontSize: 34, lineHeight: 1.25, fontWeight: 500, letterSpacing: "-0.01em" }}>{t}</span>
            </li>
          ))}
        </ol>
      </div>
    </Frame>
  );
}

function Cards({ s, deck, index, slide }: { s: Startup; deck: Deck; index: number; slide: Extract<Slide, { kind: "cards" }> }) {
  const cols = slide.items.length === 3 ? 3 : 2;
  return (
    <Frame s={s} deck={deck} index={index} eyebrow={slide.eyebrow}>
      <H max={1500}>{slide.title}</H>
      <div style={{ marginTop: 56, display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 28 }}>
        {slide.items.map((c, i) => (
          <div key={c.title} style={{ padding: "34px 38px", background: panel, border: `1px solid ${rule}`, borderRadius: 28 }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: "0.22em", color: s.accent }}>{String(i + 1).padStart(2, "0")}</p>
            <h3 style={{ margin: "14px 0 0", fontSize: 38, lineHeight: 1.12, fontWeight: 700, letterSpacing: "-0.02em" }}>{c.title}</h3>
            <p style={{ margin: "16px 0 0", fontSize: 27, lineHeight: 1.4, color: muted }}>{c.body}</p>
          </div>
        ))}
      </div>
    </Frame>
  );
}

function Steps({ s, deck, index, slide }: { s: Startup; deck: Deck; index: number; slide: Extract<Slide, { kind: "steps" }> }) {
  return (
    <Frame s={s} deck={deck} index={index} eyebrow={slide.eyebrow}>
      <H>{slide.title}</H>
      <div style={{ marginTop: 90, display: "grid", gridTemplateColumns: `repeat(${slide.items.length}, 1fr)`, gap: 40, position: "relative" }}>
        <div aria-hidden style={{ position: "absolute", left: 30, right: 30, top: 34, height: 2, background: `linear-gradient(90deg, ${s.accent}, transparent)` }} />
        {slide.items.map((it, i) => (
          <div key={it.step} style={{ position: "relative" }}>
            <span style={{ width: 70, height: 70, borderRadius: 99, background: "#06060a", border: `2px solid ${s.accent}`, display: "grid", placeItems: "center", fontSize: 30, fontWeight: 700, color: s.accent }}>{i + 1}</span>
            <h3 style={{ margin: "30px 0 0", fontSize: 40, fontWeight: 700, letterSpacing: "-0.02em" }}>{it.step}</h3>
            <p style={{ margin: "14px 0 0", fontSize: 27, lineHeight: 1.4, color: muted }}>{it.body}</p>
          </div>
        ))}
      </div>
    </Frame>
  );
}

function Product({ s, deck, index, slide }: { s: Startup; deck: Deck; index: number; slide: Extract<Slide, { kind: "product" }> }) {
  return (
    <Frame s={s} deck={deck} index={index} eyebrow={slide.eyebrow}>
      <H size={56}>{slide.title}</H>
      <div style={{ position: "relative", marginTop: 34, height: 640 }}>
        <Shot shot={slide.desktop} style={{ position: "absolute", left: 0, top: 0, width: 1100, height: 640 }} />
        {slide.mobile ? <Shot shot={slide.mobile} style={{ position: "absolute", left: 1010, top: 40, width: 290, height: 600 }} /> : null}
        <div style={{ position: "absolute", left: 1370, top: 60, width: 320 }}>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: s.accent }}>Live product</p>
          <p style={{ margin: "14px 0 0", fontSize: 26, lineHeight: 1.4, color: muted }}>{slide.desktop.caption ?? ""}</p>
          <p style={{ margin: "34px 0 0", fontSize: 22, color: ink }}>{s.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</p>
        </div>
      </div>
    </Frame>
  );
}

function Gallery({ s, deck, index, slide }: { s: Startup; deck: Deck; index: number; slide: Extract<Slide, { kind: "gallery" }> }) {
  return (
    <Frame s={s} deck={deck} index={index} eyebrow={slide.eyebrow}>
      <H size={56}>{slide.title}</H>
      <div style={{ marginTop: 34, display: "flex", gap: 40, alignItems: "flex-end", justifyContent: "center", height: 650 }}>
        {slide.shots.map((shot) => {
          const phone = shot.kind === "mobile";
          return (
            <figure key={shot.src} style={{ margin: 0, textAlign: "center" }}>
              <Shot shot={shot} style={phone ? { width: 300, height: 600 } : { width: 700, height: 500 }} />
              <figcaption style={{ marginTop: 22, fontSize: 22, color: muted, maxWidth: phone ? 300 : 700, marginInline: "auto" }}>{shot.caption}</figcaption>
            </figure>
          );
        })}
      </div>
    </Frame>
  );
}

function Figures({ s, deck, index, slide }: { s: Startup; deck: Deck; index: number; slide: Extract<Slide, { kind: "figures" }> }) {
  return (
    <Frame s={s} deck={deck} index={index} eyebrow={slide.page ? `${slide.eyebrow} · ${slide.page}` : slide.eyebrow}>
      <H max={1500}>{slide.title}</H>
      <div style={{ marginTop: 50, display: "grid", gridTemplateColumns: `repeat(${slide.figures.length}, 1fr)`, gap: 30 }}>
        {slide.figures.map((f) => (
          <div key={f.figure + f.label} style={{ padding: "36px 38px 32px", background: panel, border: `1px solid ${rule}`, borderRadius: 28, display: "flex", flexDirection: "column", minHeight: 560 }}>
            <p style={{ margin: 0, fontSize: 96, lineHeight: 1, fontWeight: 800, letterSpacing: "-0.04em", color: s.accent, fontVariantNumeric: "tabular-nums" }}>{f.figure}</p>
            <p style={{ margin: "22px 0 0", fontSize: 29, lineHeight: 1.28, fontWeight: 600 }}>{f.label}</p>
            {f.detail ? <p style={{ margin: "14px 0 0", fontSize: 23, lineHeight: 1.4, color: muted }}>{f.detail}</p> : null}
            <p style={{ margin: "auto 0 0", paddingTop: 22, fontSize: 19, lineHeight: 1.4, color: subtle, borderTop: `1px solid ${rule}` }}>
              Source:{" "}
              <a href={f.source.url} style={{ color: ink, textDecoration: "underline", textUnderlineOffset: 4 }}>
                {sourceLine(f)}
              </a>
              {f.note ? <span style={{ display: "block", marginTop: 6 }}>{f.note}</span> : null}
            </p>
          </div>
        ))}
      </div>
    </Frame>
  );
}

function WhyNow({ s, deck, index, slide }: { s: Startup; deck: Deck; index: number; slide: Extract<Slide, { kind: "whynow" }> }) {
  return (
    <Frame s={s} deck={deck} index={index} eyebrow={slide.eyebrow}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 520px", gap: 70 }}>
        <div>
          <H size={60} max={1100}>
            {slide.title}
          </H>
          <div style={{ marginTop: 44, display: "grid", gap: 22 }}>
            {slide.items.map((t, i) => (
              <div key={t} style={{ display: "flex", gap: 24, padding: "26px 32px", background: panel, border: `1px solid ${rule}`, borderRadius: 24 }}>
                <span style={{ flex: "none", fontSize: 22, fontWeight: 700, letterSpacing: "0.2em", color: s.accent, paddingTop: 5 }}>{String(i + 1).padStart(2, "0")}</span>
                <span style={{ fontSize: 28, lineHeight: 1.35, fontWeight: 500 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ paddingTop: 26 }}>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: subtle }}>Who buys</p>
          <ul style={{ margin: "26px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 20 }}>
            {slide.segments.map((t) => (
              <li key={t} style={{ display: "flex", gap: 16, fontSize: 26, lineHeight: 1.35, color: muted }}>
                <span style={{ flex: "none", width: 12, height: 12, marginTop: 12, borderRadius: 99, background: s.accent }} />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Frame>
  );
}

function Plans({ s, deck, index, slide }: { s: Startup; deck: Deck; index: number; slide: Extract<Slide, { kind: "plans" }> }) {
  return (
    <Frame s={s} deck={deck} index={index} eyebrow={slide.eyebrow}>
      <H size={58} max={1500}>
        {slide.title}
      </H>
      <p style={{ margin: "22px 0 0", fontSize: 24, lineHeight: 1.45, color: muted, maxWidth: 1560 }}>{slide.lede}</p>
      <div style={{ marginTop: 36, display: "grid", gridTemplateColumns: `repeat(${slide.plans.length}, 1fr)`, gap: 26 }}>
        {slide.plans.map((p) => (
          <div key={p.name} style={{ padding: "28px 34px", background: panel, border: p.featured ? `2px solid ${s.accent}` : `1px solid ${rule}`, borderRadius: 26 }}>
            <h3 style={{ margin: 0, fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em" }}>{p.name}</h3>
            <p style={{ margin: "6px 0 0", fontSize: 23, fontWeight: 600, color: s.accent }}>{p.tagline}</p>
            <ul style={{ margin: "20px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 12 }}>
              {p.bullets.slice(0, 4).map((b) => (
                <li key={b} style={{ display: "flex", gap: 14, fontSize: 22, lineHeight: 1.35, color: muted }}>
                  <span style={{ flex: "none", width: 9, height: 9, marginTop: 10, borderRadius: 99, background: s.accent }} />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Frame>
  );
}

function Traction({ s, deck, index, slide }: { s: Startup; deck: Deck; index: number; slide: Extract<Slide, { kind: "traction" }> }) {
  return (
    <Frame s={s} deck={deck} index={index} eyebrow={slide.eyebrow}>
      <H>{slide.title}</H>
      <p style={{ margin: "18px 0 0", fontSize: 25, color: muted, maxWidth: 1300 }}>Read from the product&apos;s own public engineering tracker and live site. Code, trackers and demos are available to serious parties on request.</p>
      <div style={{ marginTop: 46, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 26 }}>
        {slide.items.map((t) => (
          <div key={t.label} style={{ padding: "32px 32px 30px", background: panel, border: `1px solid ${rule}`, borderRadius: 26, minHeight: 400 }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: subtle }}>{t.label}</p>
            <p style={{ margin: "20px 0 0", fontSize: t.value.length > 12 ? 50 : 76, lineHeight: 1.05, fontWeight: 800, letterSpacing: "-0.03em", color: s.accent, fontVariantNumeric: "tabular-nums" }}>{t.value}</p>
            {t.note ? <p style={{ margin: "20px 0 0", fontSize: 22, lineHeight: 1.4, color: muted }}>{t.note}</p> : null}
          </div>
        ))}
      </div>
    </Frame>
  );
}

function Roadmap({ s, deck, index, slide }: { s: Startup; deck: Deck; index: number; slide: Extract<Slide, { kind: "roadmap" }> }) {
  return (
    <Frame s={s} deck={deck} index={index} eyebrow={slide.eyebrow}>
      <H>{slide.title}</H>
      <div style={{ marginTop: 56, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28 }}>
        {slide.columns.map((c) => (
          <div key={c.horizon} style={{ padding: "34px 36px", background: panel, border: `1px solid ${rule}`, borderRadius: 28, minHeight: 520 }}>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: s.accent }}>{c.horizon}</p>
            <ul style={{ margin: "26px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 20 }}>
              {c.items.map((t) => (
                <li key={t} style={{ display: "flex", gap: 16, fontSize: 26, lineHeight: 1.35, color: ink }}>
                  <span style={{ flex: "none", width: 10, height: 10, marginTop: 12, borderRadius: 99, background: subtle }} />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Frame>
  );
}

function Ask({ s, deck, index, slide }: { s: Startup; deck: Deck; index: number; slide: Extract<Slide, { kind: "ask" }> }) {
  const host = (u: string) => u.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return (
    <Frame s={s} deck={deck} index={index} eyebrow={slide.eyebrow} glow={1.5}>
      <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", paddingBottom: 30 }}>
        <h2 style={{ margin: 0, fontSize: 74, lineHeight: 1.06, fontWeight: 700, letterSpacing: "-0.035em", maxWidth: 1480, textWrap: "balance" }}>{slide.title}</h2>
        <div style={{ marginTop: 64, display: "flex", gap: 22, flexWrap: "wrap" }}>
          {[
            { k: "Talk to the founder", v: site.contactEmail },
            { k: "Try the product", v: host(s.url) },
            { k: "Investor materials", v: `wonderapps.biz/startups/${s.slug}` },
          ].map((c) => (
            <div key={c.k} style={{ padding: "22px 34px", borderRadius: 22, background: panel, border: `1px solid ${rule}` }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: s.accent }}>{c.k}</p>
              <p style={{ margin: "8px 0 0", fontSize: 30, fontWeight: 600 }}>{c.v}</p>
            </div>
          ))}
        </div>
        <p style={{ margin: "34px 0 0", fontSize: 21, color: subtle, maxWidth: 1400, lineHeight: 1.45 }}>
          Terms, data room and technical diligence are shared in conversation. This overview is informational and is not an offer to sell, or a solicitation of an offer to buy, any security.
        </p>
      </div>
    </Frame>
  );
}

function Sources({ s, deck, index, slide }: { s: Startup; deck: Deck; index: number; slide: Extract<Slide, { kind: "sources" }> }) {
  return (
    <Frame s={s} deck={deck} index={index} eyebrow={slide.eyebrow}>
      <H size={52}>{slide.title}</H>
      <ol style={{ margin: "36px 0 0", padding: 0, listStyle: "none", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "22px 48px" }}>
        {slide.figures.map((f, i) => (
          <li key={f.source.url + f.label} style={{ display: "flex", gap: 18, fontSize: 19, lineHeight: 1.4, color: muted }}>
            <span style={{ flex: "none", width: 30, color: s.accent, fontWeight: 700 }}>{i + 1}.</span>
            <span>
              <strong style={{ color: ink, fontWeight: 600 }}>{f.figure}</strong> — {f.label}. {f.source.publisher}, <em>{f.source.title}</em> ({f.source.year}).
              <br />
              <a href={f.source.url} style={{ color: subtle, wordBreak: "break-all" }}>
                {f.source.url}
              </a>
              {f.note ? <span style={{ display: "block", color: subtle }}>{f.note}</span> : null}
            </span>
          </li>
        ))}
      </ol>
    </Frame>
  );
}

/* --- entry point --------------------------------------------------------- */

export function SlideView({ deck, index }: { deck: Deck; index: number }) {
  const s = deck.startup;
  const slide = deck.slides[index];
  const p = { s, deck, index };
  switch (slide.kind) {
    case "cover":
      return <Cover {...p} />;
    case "list":
      return <List {...p} slide={slide} />;
    case "cards":
      return <Cards {...p} slide={slide} />;
    case "steps":
      return <Steps {...p} slide={slide} />;
    case "product":
      return <Product {...p} slide={slide} />;
    case "gallery":
      return <Gallery {...p} slide={slide} />;
    case "figures":
      return <Figures {...p} slide={slide} />;
    case "whynow":
      return <WhyNow {...p} slide={slide} />;
    case "plans":
      return <Plans {...p} slide={slide} />;
    case "traction":
      return <Traction {...p} slide={slide} />;
    case "roadmap":
      return <Roadmap {...p} slide={slide} />;
    case "ask":
      return <Ask {...p} slide={slide} />;
    case "sources":
      return <Sources {...p} slide={slide} />;
  }
}
