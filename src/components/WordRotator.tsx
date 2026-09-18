"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * A vertical word ticker. The words are stacked in a column that slides up one
 * line at a time; a soft mask fades the neighbours so the centred word reads
 * on its own while the next one is glimpsed arriving. Pure CSS transforms —
 * the only JavaScript is the interval.
 */
export function WordRotator({
  words,
  interval = 2600,
  className = "",
}: {
  words: readonly string[];
  interval?: number;
  className?: string;
}) {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setI((n) => (n + 1) % words.length), interval);
    // Don't advance while the tab is hidden, so the reader never returns mid-slide.
    const onVis = () => (document.hidden ? window.clearInterval(id) : undefined);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [interval, words.length, reduce]);

  return (
    <span className={`word-rotator ${className}`}>
      {/* The sentence for assistive tech and search engines: one static word. */}
      <span className="sr-only">{words[0]}</span>
      <span className="word-rotator-window" aria-hidden>
        <span className="word-rotator-track" style={{ transform: `translateY(${-i}em)` }}>
          {words.map((w, n) => (
            <span key={w} className="word-rotator-item" data-active={n === i || undefined}>
              {w}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}
