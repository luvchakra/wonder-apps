import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { site } from "@/content/site";
import { startups } from "@/content/startups";
import { EmailCTA } from "./EmailCTA";
import { Logo, Wordmark } from "./Logo";

export function Footer() {
  return (
    <footer className="theme-dark border-t border-line bg-bg text-fg">
      <div className="container py-14 sm:py-20">
        <div className="grid gap-12 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Logo className="h-7 w-auto" />
              <Wordmark className="text-xl" />
            </Link>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-fg-subtle">{site.tagline}</p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-fg-muted">{site.positioning}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href={site.contactPath} className="inline-flex items-center gap-1.5 rounded-full bg-fg px-4 py-2 text-sm font-medium text-bg transition-opacity hover:opacity-85">
                Contact the founder <ArrowUpRight className="size-4" />
              </Link>
              <EmailCTA name={site.name} tone="ghostDark" />
            </div>
          </div>

          <div>
            <p className="eyebrow text-fg-subtle">Portfolio</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {startups.map((s) => (
                <li key={s.slug}>
                  <Link href={`/startups/${s.slug}`} className="text-fg-muted transition-colors hover:text-fg">
                    {s.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/#thesis" className="text-fg-muted transition-colors hover:text-fg">
                  Investment thesis
                </Link>
              </li>
              <li>
                <Link href="/#chassis" className="text-fg-muted transition-colors hover:text-fg">
                  Shared platform
                </Link>
              </li>
              <li>
                <Link href="/appstracker" className="text-fg-muted transition-colors hover:text-fg">
                  Engineering tracker
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="eyebrow text-fg-subtle">Live products &amp; guides</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {startups.map((s) => (
                <li key={s.slug} className="flex flex-wrap gap-x-2">
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-fg-muted transition-colors hover:text-fg">
                    {s.name}
                  </a>
                  <span className="text-fg-subtle">·</span>
                  <a href={s.helpUrl} target="_blank" rel="noopener noreferrer" className="text-fg-muted transition-colors hover:text-fg">
                    Help centre
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="eyebrow text-fg-subtle">Legal</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {site.legal.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-fg-muted transition-colors hover:text-fg">
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href={site.contactPath} className="text-fg-muted transition-colors hover:text-fg">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-line pt-6 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {site.legalName}. All rights reserved.</p>
          <p className="max-w-xl">
            Not an offer of securities. Build-progress figures are from each product&apos;s public engineering trackers as of {site.lastUpdated}. See the{" "}
            <Link href="/disclaimer" className="underline underline-offset-2 hover:text-fg">
              Investor Disclaimer
            </Link>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
