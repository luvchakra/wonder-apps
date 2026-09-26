import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // WonderAgent was renamed WonderID on 2026-09-26; keep links already shared with investors working.
  async redirects() {
    return [{ source: "/startups/wonderagent", destination: "/startups/wonderid", permanent: true }];
  },
};

export default nextConfig;
