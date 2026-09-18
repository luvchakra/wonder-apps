"use client";

import { useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = useReducedMotion();
  // Animate only the leading integer; keep suffix/prefix verbatim (e.g. "132 / 170", "84%", "13 ADRs").
  const match = value.match(/^(\D*?)(\d[\d,]*)(.*)$/);
  useEffect(() => {
    if (!ref.current || !match || reduce) return;
    if (!inView) return;
    const target = parseInt(match[2].replace(/,/g, ""), 10);
    ref.current.textContent = "0";
    const controls = animate(0, target, {
      duration: 1.4,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = Math.round(v).toLocaleString("en-US");
      },
    });
    return () => controls.stop();
  }, [inView, match, reduce]);
  if (!match) return <>{value}</>;
  // Server and first client paint both show the real value, so hydration never
  // disagrees; the effect above rewinds to 0 and counts up once in view.
  return (
    <>
      {match[1]}
      <span ref={ref}>{match[2]}</span>
      {match[3]}
    </>
  );
}

export function Stat({ label, value, note, accent }: { label: string; value: string; note?: string; accent?: string }) {
  return (
    <div className="card p-6 sm:p-7">
      <p className="eyebrow text-fg-subtle">{label}</p>
      <p className="headline mt-3 text-[clamp(1.75rem,3vw,2.5rem)] tabular-nums" style={accent ? { color: accent } : undefined}>
        <CountUp value={value} />
      </p>
      {note ? <p className="mt-2 text-sm leading-relaxed text-fg-muted">{note}</p> : null}
    </div>
  );
}
