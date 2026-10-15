import type { Metadata, Viewport } from "next";
import "./globals.css";
import { site } from "@/content/site";
import { ScrollMemory } from "@/components/ScrollMemory";
import { SiteChrome } from "@/components/SiteChrome";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Motion } from "@/components/Motion";
import { getSiteCopy, getStartups } from "@/lib/content/load";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getSiteCopy();
  return {
    metadataBase: new URL(site.url),
    title: { default: `${site.name} — ${copy.tagline.replace(/\.$/, "")}`, template: `%s · ${site.name}` },
    description: copy.description,
    openGraph: {
      title: `${site.name} — Investor Portfolio`,
      description: copy.description,
      url: site.url,
      siteName: site.name,
      type: "website",
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${site.name} — five AI-native startups` }],
    },
    twitter: { card: "summary_large_image", title: site.name, description: copy.description },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [startups, copy] = await Promise.all([getStartups(), getSiteCopy()]);
  const products = startups.map((s) => ({ slug: s.slug, name: s.name, category: s.category }));
  return (
    <html lang="en">
      <body className="min-h-dvh flex flex-col">
        <Motion>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-fg focus:px-4 focus:py-2 focus:text-bg"
          >
            Skip to content
          </a>
          <SiteChrome>
            <ScrollMemory />
            <Nav products={products} />
          </SiteChrome>
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteChrome>
            <Footer products={products} copy={copy} />
          </SiteChrome>
        </Motion>
      </body>
    </html>
  );
}
