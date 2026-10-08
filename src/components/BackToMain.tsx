"use client";

import { ChevronLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { HOME_RESTORE_KEY } from "./ScrollMemory";

/**
 * Returns the reader to the main WonderApps page, at the spot they left it.
 * Renders nothing on the main page itself. Used in the nav bar and above the footer.
 */
export function BackToMain({ variant = "nav", onNavigate }: { variant?: "nav" | "footer"; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === "/") return null;

  const go = () => {
    try {
      window.sessionStorage.setItem(HOME_RESTORE_KEY, "1");
    } catch {
      /* they simply land at the top */
    }
    onNavigate?.();
    router.push("/");
  };

  const cls =
    variant === "nav"
      ? "inline-flex h-9 items-center gap-1 rounded-full bg-white/10 pl-2 pr-3.5 text-[13px] font-medium text-fg ring-1 ring-white/15 transition-colors hover:bg-white/15"
      : "inline-flex h-11 items-center gap-1.5 rounded-full bg-fg pl-3 pr-5 text-sm font-medium text-bg transition-opacity hover:opacity-85";

  return (
    <button type="button" onClick={go} className={cls} aria-label="Back to the WonderApps main page">
      <ChevronLeft className="size-4" />
      {variant === "nav" ? "Back" : "Back to WonderApps"}
    </button>
  );
}
