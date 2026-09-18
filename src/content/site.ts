export const site = {
  name: "WonderApps",
  legalName: "WonderApps",
  /** Brand line from the identity sheet. */
  tagline: "Ideas for a brighter tomorrow.",
  /** Descriptive line for investors. */
  positioning: "Four AI-native products. One engineering chassis. One founder-operator.",
  description:
    "WonderApps is the portfolio of WonderHome, WonderJobs, WonderArk and WonderAgent — four AI-native software products built on one shared, security-first architecture. Investor overview and contact.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://wonderapps.vercel.app",
  /** Shown in legal pages. Set to the operating entity and jurisdiction before going live. */
  jurisdiction: "India",
  contactPath: "/contact",
  nav: [
    { href: "/#portfolio", label: "Portfolio" },
    { href: "/#thesis", label: "Thesis" },
    { href: "/#chassis", label: "Platform" },
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
  lastUpdated: "18 September 2026",
} as const;
