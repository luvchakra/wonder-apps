import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Download, Presentation } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/ui";
import { buildDeck } from "@/content/decks";
import { startups } from "@/content/startups";

export const metadata: Metadata = {
  title: "Investor decks",
  description: "A short investor deck for each WonderApps startup. View it full screen on the page or download the PDF.",
  alternates: { canonical: "/decks" },
};

export default function DecksPage() {
  return (
    <>
      <section className="theme-dark relative overflow-hidden bg-bg pt-[calc(var(--nav-h)+4rem)] text-fg">
        <div className="container pb-16 text-center sm:pb-24">
          <Reveal>
            <SectionHeading eyebrow="Investor decks" title="One deck per startup." lede="Each deck stands on its own: problem, product, cited market data, business model, traction, moat, roadmap and the ask. View it on the page, in full screen, or take the PDF." align="center" />
          </Reveal>
        </div>
      </section>
      <section className="theme-light section bg-bg-soft text-fg">
        <div className="container grid gap-4 md:grid-cols-2">
          {startups.map((s, i) => {
            const d = buildDeck(s);
            return (
              <Reveal key={s.slug} delay={(i % 2) * 0.06} className="card flex flex-col p-7 sm:p-9">
                <p className="eyebrow" style={{ color: s.accent }}>{s.category}</p>
                <h2 className="title mt-3 text-3xl">{s.name}</h2>
                <p className="mt-2 text-fg-muted">{s.oneLiner}</p>
                <p className="mt-4 text-sm text-fg-subtle">{d.slides.length} slides · PDF</p>
                <div className="mt-auto flex flex-wrap items-center gap-3 pt-7 text-sm font-medium">
                  <Link href={`/startups/${s.slug}#deck`} className="inline-flex items-center gap-2 rounded-full bg-fg px-5 py-2.5 text-bg transition-opacity hover:opacity-85">
                    <Presentation className="size-4" /> View deck
                  </Link>
                  <a href={d.file} download={d.fileName} className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 hover:bg-fg/5">
                    <Download className="size-4" /> Download PDF
                  </a>
                  <Link href={`/startups/${s.slug}`} className="inline-flex items-center gap-1.5 text-fg-muted hover:text-fg">
                    Deep dive <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>
    </>
  );
}
