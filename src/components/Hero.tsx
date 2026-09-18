"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { startups } from "@/content/startups";
import { Device } from "./Device";
import { Button } from "./ui";
import { Logo } from "./Logo";

const ease = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const textY = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const stageY = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const stageScale = useTransform(scrollYProgress, [0, 1], [1, 0.92]);
  const phoneY = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const phoneY2 = useTransform(scrollYProgress, [0, 1], [0, 60]);

  const [home, jobs, ark, agent] = startups;
  const laptop = agent.screens.find((s) => s.kind === "desktop")!;
  const phoneA = jobs.screens.find((s) => s.kind === "mobile")!;
  const phoneB = home.screens.find((s) => s.kind === "mobile")!;
  const laptop2 = ark.screens.find((s) => s.kind === "desktop")!;

  return (
    <section ref={ref} className="theme-dark relative overflow-hidden bg-bg text-fg" aria-labelledby="hero-title">
      {/* Ambient colour: one orb per product */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="orb orb-a left-[-10%] top-[-10%] size-[46vw] bg-[oklch(0.49_0.13_190)]" />
        <div className="orb orb-b right-[-12%] top-[6%] size-[42vw] bg-[oklch(0.55_0.23_285)]" />
        <div className="orb orb-a bottom-[-12%] left-[24%] size-[40vw] bg-[oklch(0.546_0.215_260)]" style={{ animationDelay: "-6s" }} />
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
            {["Four products.", "One chassis.", "Built for the agent era."].map((line, i) => (
              <span key={line} className="block overflow-hidden">
                <motion.span
                  className={`block ${i === 2 ? "text-gradient" : ""}`}
                  initial={{ y: "110%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 1, ease, delay: 0.15 + i * 0.12 }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease, delay: 0.6 }}
            className="lede mx-auto mt-7 max-w-2xl text-[clamp(1.0625rem,1.7vw,1.375rem)] text-fg-muted"
          >
            WonderHome runs the household. WonderJobs runs the job search. WonderArk runs the business. WonderAgent governs
            the AI agents doing all of it. Four AI-native products on one security-first architecture — shipped by one
            founder-operator in a single season.
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
              Request the deck
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
          <div className="relative mx-auto w-[88%] sm:w-[78%]">
            <Device shot={laptop} priority sizes="(min-width: 1024px) 860px, 88vw" />
          </div>
          <motion.div style={reduce ? undefined : { y: phoneY }} className="absolute -left-2 bottom-[-8%] w-[26%] max-w-[190px] sm:left-[2%] sm:w-[19%]">
            <Device shot={phoneA} priority sizes="190px" />
          </motion.div>
          <motion.div style={reduce ? undefined : { y: phoneY2 }} className="absolute -right-2 top-[18%] w-[24%] max-w-[180px] sm:right-[1%] sm:w-[18%]">
            <Device shot={phoneB} priority sizes="180px" />
          </motion.div>
          <motion.div
            style={reduce ? undefined : { y: phoneY2 }}
            className="absolute -bottom-[14%] right-[6%] hidden w-[38%] lg:block"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1.1, ease, delay: 0.9 }}
          >
            <Device shot={laptop2} sizes="420px" />
          </motion.div>
        </motion.div>

        {/* Product index */}
        <motion.ul
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="mt-24 grid grid-cols-2 gap-3 sm:mt-32 lg:grid-cols-4"
        >
          {startups.map((s) => (
            <li key={s.slug}>
              <Link href={`/startups/${s.slug}`} className="group block rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-colors hover:bg-white/[0.08]">
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
