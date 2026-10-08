"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** The marketing site's nav, footer and scroll memory stay off the founder dashboard. */
export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return pathname.startsWith("/dashboard") ? null : <>{children}</>;
}
