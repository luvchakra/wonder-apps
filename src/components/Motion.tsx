"use client";

import { MotionConfig } from "framer-motion";

/** Honours the OS reduced-motion preference for every animation on the site. */
export function Motion({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
