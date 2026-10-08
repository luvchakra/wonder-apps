"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BarChart3, Mail } from "lucide-react";

export type NavApp = { slug: string; name: string; color: string };

const item = "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors";

/** Sidebar on desktop, a scrolling pill row on phones. The chosen range carries across pages. */
export function DashNav({ apps }: { apps: NavApp[] }) {
  const path = usePathname();
  const range = useSearchParams().get("range");
  const q = range && ["7d", "30d", "90d"].includes(range) ? `?range=${range}` : "";
  const links = [
    { href: "/dashboard", label: "Overview", icon: <BarChart3 className="size-4" />, active: path === "/dashboard" },
    ...apps.map((a) => ({ href: `/dashboard/${a.slug}`, label: a.name, icon: <span className="size-2.5 rounded-full" style={{ background: a.color }} />, active: path === `/dashboard/${a.slug}` })),
    { href: "/dashboard/newsletter", label: "Newsletter", icon: <Mail className="size-4" />, active: path === "/dashboard/newsletter" },
  ];
  return (
    <nav aria-label="Dashboard" className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
      {links.map((l) => (
        <Link
          key={l.href}
          href={`${l.href}${l.href === "/dashboard/newsletter" ? "" : q}`}
          aria-current={l.active ? "page" : undefined}
          className={`${item} shrink-0 whitespace-nowrap`}
          style={{ background: l.active ? "rgba(255,255,255,0.09)" : "transparent", color: l.active ? "#fff" : "#c3c2b7" }}
        >
          <span className="grid size-4 place-items-center" aria-hidden>{l.icon}</span>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
