import type { MetadataRoute } from "next";
import { site } from "@/content/site";

// AI training and AI-answer crawlers are kept off the whole site; search engines still index the
// public pages. Polite crawlers only: the edge firewall is what stops the rest.
const AI_CRAWLERS = [
  "GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "Claude-Web", "anthropic-ai", "CCBot", "PerplexityBot",
  "Google-Extended", "Applebot-Extended", "Bytespider", "Amazonbot", "meta-externalagent", "cohere-ai", "Diffbot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: AI_CRAWLERS, disallow: "/" },
      { userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard", "/decks/*/print"] },
    ],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
