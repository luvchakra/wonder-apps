export const site = {
  name: "WonderApps",
  legalName: "WonderApps",
  /** Brand line from the identity sheet. */
  tagline: "Ideas for a brighter tomorrow.",
  /** Descriptive line for investors. */
  positioning: "Five AI-native startups across five markets. Investor decks, cited market data and live products.",
  description:
    "WonderApps is an investor portfolio of five AI-native startups — WonderHome, WonderJobs, Wonder Creator, WonderArk and WonderID. Each has a live product, a cited market case and a downloadable investor deck.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://wonderapps.biz",
  /** Shown in legal pages. Set to the operating entity and jurisdiction before going live. */
  jurisdiction: "India",
  contactPath: "/contact",
  /** Same inbox for every product — the respective business name is what changes next to it in copy. */
  contactEmail: "connect@wonderapps.biz",
  nav: [
    { href: "/#portfolio", label: "Portfolio" },
    { href: "/#snapshot", label: "At a glance" },
    { href: "/decks", label: "Investor decks" },
    { href: "/#founder", label: "Founder" },
  ],
  legal: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Use" },
    { href: "/cookies", label: "Cookie Policy" },
    { href: "/disclaimer", label: "Investor Disclaimer" },
    { href: "/accessibility", label: "Accessibility" },
    { href: "/security", label: "Security" },
  ],
  lastUpdated: "8 October 2026",
} as const;
