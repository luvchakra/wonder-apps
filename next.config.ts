import type { NextConfig } from "next";

// Pages only: /api routes set their own headers (the newsletter preview frames itself with its own CSP).
// No 'unsafe-eval'; inline scripts stay allowed for Next's hydration payload. No global
// Cross-Origin-Resource-Policy, because newsletter emails load images from the site.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      { source: "/((?!api/).*)", headers: securityHeaders },
      // The applicant's status link carries a private token: never pass it on as a referrer.
      { source: "/careers/status", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
      { source: "/_next/static/:path*", headers: [{ key: "Cross-Origin-Resource-Policy", value: "same-origin" }] },
    ];
  },
  // WonderAgent was renamed WonderID on 2026-09-26; keep links already shared with investors working.
  async redirects() {
    return [{ source: "/startups/wonderagent", destination: "/startups/wonderid", permanent: true }];
  },
};

export default nextConfig;
