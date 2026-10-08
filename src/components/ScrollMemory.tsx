"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export const HOME_SCROLL_KEY = "wa:home-scroll";
export const HOME_RESTORE_KEY = "wa:home-restore";

const read = (k: string) => {
  try {
    return window.sessionStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string | null) => {
  try {
    if (v === null) window.sessionStorage.removeItem(k);
    else window.sessionStorage.setItem(k, v);
  } catch {
    /* storage can be blocked; the page still works, it just opens at the top */
  }
};

/**
 * Remembers how far down the main page the reader was, and puts them back there
 * when they return from any other page (our Back button or the browser's).
 * Without it, every trip into a deep dive or legal page costs them their place.
 */
export function ScrollMemory() {
  const pathname = usePathname();

  // A browser back/forward press also counts as "returning".
  useEffect(() => {
    const onPop = () => write(HOME_RESTORE_KEY, "1");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (pathname !== "/") return;

    let timers: number[] = [];
    if (read(HOME_RESTORE_KEY) === "1" && !window.location.hash) {
      const y = Number(read(HOME_SCROLL_KEY) ?? 0);
      if (y > 0) {
        // The page is tall and fills in as images arrive; re-assert for a moment.
        const go = () => window.scrollTo({ top: y, behavior: "instant" });
        go();
        timers = [60, 250, 700].map((ms) => window.setTimeout(go, ms));
      }
    }
    write(HOME_RESTORE_KEY, null);

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => write(HOME_SCROLL_KEY, String(Math.round(window.scrollY))));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);

  return null;
}
