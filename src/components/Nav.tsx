"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { site } from "@/content/site";
import { startups } from "@/content/startups";
import { Logo, Wordmark } from "./Logo";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="theme-dark fixed inset-x-0 top-0 z-50 text-fg">
      {/* Always a dark translucent bar, whatever sits beneath it — the one constant across light and dark bands. */}
      <div className={`glass transition-shadow duration-500 ${scrolled || open ? "shadow-[0_1px_0_var(--line)]" : ""}`}>
        <nav className="container flex h-[var(--nav-h)] items-center justify-between" aria-label="Primary">
          <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight" onClick={() => setOpen(false)}>
            <Logo className="h-5 w-auto" priority />
            <Wordmark className="text-[16px]" />
          </Link>
          <ul className="hidden items-center gap-7 md:flex">
            {startups.map((s) => (
              <li key={s.slug}>
                <Link href={`/startups/${s.slug}`} className="text-[13px] text-fg-muted transition-colors hover:text-fg">
                  {s.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/#thesis" className="text-[13px] text-fg-muted transition-colors hover:text-fg">
                Thesis
              </Link>
            </li>
            <li>
              <Link href={site.contactPath} className="rounded-full bg-fg px-3.5 py-1.5 text-[13px] font-medium text-bg transition-opacity hover:opacity-85">
                Talk to the founder
              </Link>
            </li>
          </ul>
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full md:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </nav>
      </div>
      <AnimatePresence>
        {open ? (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="glass fixed inset-x-0 top-[var(--nav-h)] bottom-0 z-40 overflow-y-auto md:hidden"
          >
            <ul className="container flex flex-col gap-1 py-6">
              {startups.map((s, i) => (
                <motion.li key={s.slug} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}>
                  <Link href={`/startups/${s.slug}`} className="flex items-center justify-between py-3 text-2xl font-semibold tracking-tight" onClick={() => setOpen(false)}>
                    {s.name}
                    <span className="text-sm font-normal text-fg-subtle">{s.category.split("·")[0]}</span>
                  </Link>
                </motion.li>
              ))}
              {site.nav.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="block py-3 text-lg text-fg-muted" onClick={() => setOpen(false)}>
                    {n.label}
                  </Link>
                </li>
              ))}
              <li className="pt-4">
                <Link href={site.contactPath} className="block rounded-full bg-fg py-3 text-center font-medium text-bg" onClick={() => setOpen(false)}>
                  Talk to the founder
                </Link>
              </li>
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
