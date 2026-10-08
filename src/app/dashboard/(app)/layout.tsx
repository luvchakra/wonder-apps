import type { Metadata } from "next";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { DashNav } from "@/components/dashboard/DashNav";
import { Logo, Wordmark } from "@/components/Logo";
import { appColor } from "@/lib/dashboard/colors";
import { requireSession } from "@/lib/dashboard/session";
import { startups } from "@/content/startups";

export const metadata: Metadata = { title: "Founder dashboard", robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const apps = startups.map((s) => ({ slug: s.slug, name: s.name, color: appColor(s.slug) }));
  return (
    <div className="dash lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="border-b p-4 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:border-b-0 lg:border-r lg:p-5" style={{ borderColor: "var(--d-line)" }}>
        <Link href="/dashboard" className="mb-4 flex items-center gap-2.5 lg:mb-8">
          <Logo className="h-6 w-auto" />
          <span className="flex flex-col leading-tight">
            <Wordmark className="text-[15px]" />
            <span className="dash-eyebrow" style={{ fontSize: 9 }}>Founder dashboard</span>
          </span>
        </Link>
        <DashNav apps={apps} />
        <div className="mt-4 hidden border-t pt-4 lg:mt-auto lg:block" style={{ borderColor: "var(--d-line)" }}>
          <p className="truncate text-xs" style={{ color: "var(--d-ink-3)" }} title={session.email}>
            Signed in as
            <br />
            <span style={{ color: "var(--d-ink-2)" }}>{session.email}</span>
          </p>
          <form action="/api/dashboard/auth/logout" method="post" className="mt-3">
            <button type="submit" className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors hover:bg-white/10" style={{ color: "var(--d-ink-2)" }}>
              <LogOut className="size-3.5" /> Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-9 lg:px-10">
        {children}
        <div className="mt-10 flex items-center justify-between gap-4 border-t pt-4 lg:hidden" style={{ borderColor: "var(--d-line)" }}>
          <span className="truncate text-xs" style={{ color: "var(--d-ink-3)" }}>{session.email}</span>
          <form action="/api/dashboard/auth/logout" method="post">
            <button type="submit" className="inline-flex items-center gap-2 text-xs" style={{ color: "var(--d-ink-2)" }}>
              <LogOut className="size-3.5" /> Sign out
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
