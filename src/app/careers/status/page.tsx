import type { Metadata } from "next";
import { Suspense } from "react";
import { StatusView } from "@/components/careers/StatusView";
import { CareersShell } from "@/components/careers/parts";

// The token in ?t= is private to the applicant: never indexed, never sent on as a referrer
// (next.config.ts sends Referrer-Policy: no-referrer here), and only ever posted to this
// site's own /api/careers/status in a request body.
export const metadata: Metadata = {
  title: "Your application",
  robots: { index: false, follow: false },
  other: { robots: "noindex, nofollow, noai, noimageai" },
  referrer: "no-referrer",
};

export default function StatusPage() {
  return (
    <CareersShell narrow>
      <p className="eyebrow text-accent">Careers</p>
      <h1 className="display mt-4 text-[clamp(2rem,5vw,3.25rem)]">Your application</h1>
      <Suspense>
        <StatusView />
      </Suspense>
    </CareersShell>
  );
}
