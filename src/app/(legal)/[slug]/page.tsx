import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { legalBySlug, legalDocs } from "@/content/legal";
import { site } from "@/content/site";

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return legalDocs.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const d = legalBySlug(slug);
  return d ? { title: d.title, description: d.summary } : {};
}

export default async function LegalPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const d = legalBySlug(slug);
  if (!d) notFound();
  return (
    <div className="theme-light bg-bg text-fg">
      <div className="container grid gap-12 pt-[calc(var(--nav-h)+4rem)] pb-24 lg:grid-cols-12">
        <aside className="lg:col-span-3">
          <p className="eyebrow text-fg-subtle">Legal</p>
          <ul className="mt-4 space-y-2 text-sm">
            {site.legal.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={`block rounded-lg px-3 py-2 transition-colors ${l.href === `/${d.slug}` ? "bg-fg/6 font-medium" : "text-fg-muted hover:text-fg"}`}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
        <article className="lg:col-span-8 lg:col-start-5">
          <h1 className="headline text-[clamp(2rem,5vw,3.25rem)]">{d.title}</h1>
          <p className="lede mt-4 text-lg text-fg-muted">{d.summary}</p>
          <p className="mt-2 text-sm text-fg-subtle">Last updated {site.lastUpdated}</p>
          <div className="mt-12 space-y-10">
            {d.sections.map((s) => (
              <section key={s.heading}>
                <h2 className="title text-xl">{s.heading}</h2>
                {s.paragraphs.map((p) => (
                  <p key={p} className="mt-3 leading-relaxed text-fg-muted">
                    {p}
                  </p>
                ))}
                {s.bullets ? (
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-fg-muted">
                    {s.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
