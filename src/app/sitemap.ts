import type { MetadataRoute } from "next";
import { site } from "@/content/site";
import { startups } from "@/content/startups";
import { legalDocs } from "@/content/legal";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: site.url, lastModified: now, priority: 1 },
    { url: `${site.url}/contact`, lastModified: now, priority: 0.8 },
    ...startups.map((s) => ({ url: `${site.url}/startups/${s.slug}`, lastModified: now, priority: 0.9 })),
    ...legalDocs.map((d) => ({ url: `${site.url}/${d.slug}`, lastModified: now, priority: 0.3 })),
  ];
}
