"use client";

import { ChevronLeft, ChevronRight, Download, Maximize2, Minimize2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Deck } from "@/content/decks";
import { SLIDE_H, SLIDE_W, SlideView } from "./DeckSlides";

/**
 * Embedded slide viewer. Slides are authored on a fixed 1920x1080 canvas and
 * scaled to whatever box they sit in, so the on-page deck, the fullscreen deck
 * and the printed PDF are the same artwork.
 */
export function DeckViewer({ deck }: { deck: Deck }) {
  const total = deck.slides.length;
  const [index, setIndex] = useState(0);
  const [scale, setScale] = useState(0.5);
  const [full, setFull] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const touch = useRef<number | null>(null);

  const go = useCallback((n: number) => setIndex((i) => Math.min(total - 1, Math.max(0, typeof n === "number" ? n : i))), [total]);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const fit = () => setScale(Math.min(el.clientWidth / SLIDE_W, el.clientHeight / SLIDE_H));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [full]);

  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === root.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void root.current?.requestFullscreen?.().catch(() => {});
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); setIndex((i) => Math.min(total - 1, i + 1)); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); setIndex((i) => Math.max(0, i - 1)); }
    else if (e.key === "Home") setIndex(0);
    else if (e.key === "End") setIndex(total - 1);
    else if (e.key === "f" || e.key === "F") toggleFull();
  };

  const btn = "inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

  return (
    <div
      ref={root}
      tabIndex={0}
      onKeyDown={onKey}
      aria-label={`${deck.startup.name} investor deck`}
      className={`theme-dark flex flex-col bg-black text-white outline-none ${full ? "h-screen w-screen" : "overflow-hidden rounded-3xl border border-white/10"}`}
    >
      <div
        ref={stage}
        className={`relative flex items-center justify-center ${full ? "flex-1" : "aspect-video w-full"}`}
        onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touch.current == null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          touch.current = null;
          if (Math.abs(dx) > 40) setIndex((i) => Math.min(total - 1, Math.max(0, i + (dx < 0 ? 1 : -1))));
        }}
      >
        <div style={{ width: SLIDE_W * scale, height: SLIDE_H * scale, position: "relative", flex: "none" }} aria-live="polite">
          <div style={{ width: SLIDE_W, height: SLIDE_H, transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", left: 0, top: 0 }}>
            <SlideView deck={deck} index={index} />
          </div>
        </div>
        <button type="button" aria-label="Previous slide" className="absolute inset-y-0 left-0 w-1/5 cursor-w-resize opacity-0" onClick={() => go(index - 1)} tabIndex={-1} />
        <button type="button" aria-label="Next slide" className="absolute inset-y-0 right-0 w-1/5 cursor-e-resize opacity-0" onClick={() => go(index + 1)} tabIndex={-1} />
      </div>

      <div className="flex items-center gap-3 border-t border-white/10 bg-[#0b0b10] px-4 py-3">
        <button type="button" className={btn} onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous slide"><ChevronLeft size={18} /></button>
        <button type="button" className={btn} onClick={() => go(index + 1)} disabled={index === total - 1} aria-label="Next slide"><ChevronRight size={18} /></button>
        <span className="min-w-14 text-[13px] tabular-nums text-white/70">{index + 1} / {total}</span>
        <div className="hidden h-1 flex-1 overflow-hidden rounded-full bg-white/10 sm:block" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={index + 1}>
          <div className="h-full rounded-full" style={{ width: `${((index + 1) / total) * 100}%`, background: deck.startup.accent }} />
        </div>
        <span className="flex-1 sm:hidden" />
        <a href={deck.file} download={deck.fileName} className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 text-[13px] font-medium text-white transition hover:bg-white/15">
          <Download size={16} /> <span className="hidden sm:inline">Download PDF</span><span className="sm:hidden">PDF</span>
        </a>
        <button type="button" className={btn} onClick={toggleFull} aria-label={full ? "Exit full screen" : "View full screen"}>{full ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
      </div>
    </div>
  );
}
