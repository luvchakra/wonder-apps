"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { startups } from "@/content/startups";
import { DevicePair } from "./DevicePair";
import { Button } from "./ui";
import { Logo } from "./Logo";
import { WordRotator } from "./WordRotator";

const ease = [0.22, 1, 0.36, 1] as const;

/** Completes "Built for the …", one phrase per startup in portfolio order. Kept short so none wraps on a phone. */
const ROTATING: Record<string, string> = {
  wonderhome: "household.",
  wonderjobs: "job seeker.",
  wondercreator: "creator.",
  wonderark: "business.",
  wonderid: "enterprise.",
};
const DWELL = 4800;

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const textY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.5, 0.9], [1, 1, 0]);
  const stageY = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const stageScale = useTransform(scrollYProgress, [0, 1], [1, 0.96]);
  
  // One startup on stage at a time: each is shown on its own merits, never composed with another.
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setActive((n) => (n + 1) % startups.length), DWELL);
    return () => window.clearInterval(id);
  }, [reduce]);
  const cur = startups[active];
  const laptop = cur.screens.find((s) => s.kind === "desktop")!;
  const phone = cur.screens.find((s) => s.kind === "mobile");

  return (
    <section ref={ref} className="theme-dark relative overflow-hidden bg-bg text-fg" aria-labelledby="hero-title">
      {/* Ambient colour follows the startup on stage */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="orb orb-a left-[-10%] top-[-10%] size-[46vw] transition-[background-color] duration-[1400ms]" style={{ background: cur.accent }} />
        <div className="orb orb-b right-[-12%] top-[6%] size-[42vw] opacity-60 transition-[background-color] duration-[1400ms]" style={{ background: cur.accent }} />
        <div className="orb orb-a bottom-[-12%] left-[24%] size-[40vw] opacity-50" style={{ background: "oklch(0.55 0.23 285)", animationDelay: "-6s" }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#000_85%)]" />
      </div>

      <div className="container relative flex min-h-[100svh] flex-col pt-[calc(var(--nav-h)+4rem)] pb-16 sm:pt-[calc(var(--nav-h)+5.5rem)]">
        <motion.div style={reduce ? undefined : { y: textY, opacity: textOpacity }} className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, ease }}
            className="mx-auto mb-6 w-[92px] sm:w-[120px]"
          >
            <Logo className="h-auto w-full drop-shadow-[0_0_40px_rgba(97,50,253,0.45)]" priority />
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.1 }}
            className="text-[11px] font-semibold uppercase tracking-[0.32em] text-fg-muted"
          >
            Ideas for a brighter tomorrow
          </motion.p>
          <h1 id="hero-title" className="display mt-6 text-[clamp(2.75rem,8.5vw,6.75rem)]">
            {["Five startups.", "Five markets.", "Built for the"].map((line, i) => (
              <span key={line} className="block overflow-hidden">
                <motion.span
                  className="block"
                  initial={{ y: "110%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 1, ease, delay: 0.15 + i * 0.12 }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
            <motion.span
              className="block"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease, delay: 0.55 }}
            >
              <WordRotator words={startups.map((s) => ROTATING[s.slug])} index={active} />
            </motion.span>
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease, delay: 0.6 }}
            className="lede mx-auto mt-7 max-w-2xl text-[clamp(1.0625rem,1.7vw,1.375rem)] text-fg-muted"
          >
            An investor portfolio of five AI-native startups, each in a different market and each live today. Read the case for
            the one that fits your thesis: problem, market with cited sources, model, traction and a downloadable deck.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease, delay: 0.75 }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button href="#portfolio" size="lg" className="bg-white text-black hover:bg-white/90">
              Explore the portfolio <ArrowRight className="size-4" />
            </Button>
            <Button href="/contact" size="lg" variant="secondary" className="bg-white/10 text-white ring-white/15 hover:bg-white/15">
              Talk to the founder
            </Button>
          </motion.div>
        </motion.div>

        {/* Device stage */}
        <motion.div
          style={reduce ? undefined : { y: stageY, scale: stageScale }}
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease, delay: 0.5 }}
          className="relative mx-auto mt-14 w-full max-w-5xl sm:mt-20"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={cur.slug}
              initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, y: -16 }}
              transition={{ duration: 0.7, ease }}
              className="relative"
            >
              <DevicePair desktop={laptop} mobile={phone} priority={active === 0} sizes="(min-width: 1024px) 760px, 80vw" className="mx-auto max-w-4xl" />
            </motion.div>
          </AnimatePresence>
          <p className="mt-10 text-center text-sm text-fg-muted" aria-live="off">
            <span className="font-semibold text-fg">{cur.name}</span> · {cur.category} ·{" "}
            <Link href={`/startups/${cur.slug}`} className="underline underline-offset-4 hover:text-fg">
              Read the case
            </Link>
          </p>
        </motion.div>

        {/* Product index */}
        <motion.ul
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="mt-24 grid grid-cols-2 gap-3 sm:mt-32 lg:grid-cols-5"
        >
          {startups.map((s, n) => (
            <li key={s.slug} className="last:col-span-2 lg:last:col-span-1">
              <Link href={`/startups/${s.slug}`} className={`group block h-full rounded-2xl border p-4 transition-colors hover:bg-white/[0.08] ${n === active ? "border-white/30 bg-white/[0.08]" : "border-white/10 bg-white/[0.04]"}`}>
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: s.accent }} />
                  <span className="text-[15px] font-semibold">{s.name}</span>
                </span>
                <span className="mt-1.5 block text-xs leading-relaxed text-fg-muted">{s.category}</span>
              </Link>
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
