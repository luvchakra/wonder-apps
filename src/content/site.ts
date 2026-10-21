/**
 * Site configuration: who we are, where we live and how people reach us. These are settings,
 * not copy, so they stay in code (the mailer, mailto links and metadata need them without a
 * database read). The site's words — tagline, positioning, description, jurisdiction and the
 * "last updated" date — are the `site/main` document in the database (see getSiteCopy()).
 */
export const site = {
  name: "WonderApps",
  legalName: "WonderApps",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://wonderapps.biz",
  contactPath: "/contact",
  /** Same inbox for every product — the respective business name is what changes next to it in copy. */
  contactEmail: "connect@wonderapps.biz",
  nav: [
    { href: "/#portfolio", label: "Portfolio" },
    { href: "/#snapshot", label: "At a glance" },
    { href: "/decks", label: "Investor decks" },
    { href: "/#founder", label: "Founder" },
    { href: "/careers", label: "Careers" },
  ],
  legal: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Use" },
    { href: "/cookies", label: "Cookie Policy" },
    { href: "/disclaimer", label: "Investor Disclaimer" },
    { href: "/accessibility", label: "Accessibility" },
    { href: "/security", label: "Security" },
  ],
} as const;
