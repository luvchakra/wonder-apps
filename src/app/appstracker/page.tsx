import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { productProgress } from "@/content/progress";
import { TrackerClient } from "@/components/TrackerClient";
import { Reveal } from "@/components/Reveal";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Portfolio engineering tracker",
  description:
    "High-level and story-level build progress across WonderHome, WonderJobs, WonderArk and WonderAgent, read live from each product's own public engineering tracker.",
};

export default function AppsTrackerPage() {
  return (
    <>
      <TrackerClient initial={productProgress} />
      <section className="theme-light bg-bg-soft text-fg">
        <div className="container py-14">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm leading-relaxed text-fg-muted">
              These are the founder&apos;s own engineering trackers, published in each product&apos;s public repository and read
              live here — not third-party audited. Source code, live trackers and a walkthrough are available to serious
              parties on request. See the{" "}
              <Link href="/disclaimer" className="underline underline-offset-2 hover:text-fg">
                Investor Disclaimer
              </Link>{" "}
              for how to read figures like these.
            </p>
            <Link href={site.contactPath} className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-fg px-5 py-2.5 text-sm font-medium text-bg transition-opacity hover:opacity-85">
              Ask for repository access <ArrowUpRight className="size-4" />
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
