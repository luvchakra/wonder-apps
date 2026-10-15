import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SlideView } from "@/components/DeckSlides";
import { getDeck, getStartups } from "@/lib/content/load";

export const dynamicParams = false;
export const metadata: Metadata = { robots: { index: false, follow: false } };

export async function generateStaticParams() {
  return (await getStartups()).map((s) => ({ slug: s.slug }));
}

/** Source for the downloadable PDF: every slide at 1920x1080, one per printed page. Built by `npm run decks`. */
export default async function DeckPrint({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const deck = await getDeck(slug);
  if (!deck) notFound();
  return (
    <div className="deck-print">
      <style>{`@page{size:1920px 1080px;margin:0}html,body{margin:0;background:#000}body>a,body>header,body>footer{display:none!important}.deck-print>section{break-after:page;page-break-after:always}.deck-print>section:last-child{break-after:auto}`}</style>
      {deck.slides.map((_, i) => (
        <SlideView key={i} deck={deck} index={i} />
      ))}
    </div>
  );
}
