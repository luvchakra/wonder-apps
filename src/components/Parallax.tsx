"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

/**
 * Moves its child vertically against scroll. `speed` is the fraction of the
 * scrolled distance the element drifts by: positive lags, negative leads.
 */
export function Parallax({
  children,
  speed = 0.2,
  className = "",
  scale,
}: {
  children: React.ReactNode;
  speed?: number;
  className?: string;
  /** Optional [from, to] scale over the same scroll range. */
  scale?: [number, number];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const distance = 320 * speed;
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);
  const s = useTransform(scrollYProgress, [0, 1], scale ?? [1, 1]);
  return (
    <div ref={ref} className={className}>
      <motion.div style={reduce ? undefined : { y, scale: s }} className="will-change-transform">
        {children}
      </motion.div>
    </div>
  );
}

/** Pins its child for `height` viewport-heights while scroll progress drives `children(progress)`. */
export function StickyScene({
  children,
  heightVh = 220,
  className = "",
}: {
  children: (progress: ReturnType<typeof useScroll>["scrollYProgress"]) => React.ReactNode;
  heightVh?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  return (
    <div ref={ref} style={{ height: `${heightVh}vh` }} className={`relative ${className}`}>
      <div className="sticky top-0 h-dvh overflow-hidden">{children(scrollYProgress)}</div>
    </div>
  );
}
