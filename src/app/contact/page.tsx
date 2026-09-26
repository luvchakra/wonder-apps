import type { Metadata } from "next";
import { Suspense } from "react";
import { ContactForm } from "@/components/ContactForm";
import { EmailCTA } from "@/components/EmailCTA";
import { Reveal } from "@/components/Reveal";
import { site } from "@/content/site";
import { startups } from "@/content/startups";

export const metadata: Metadata = {
  title: "Contact the founder",
  description: "Investors, partners and design customers: start a conversation about WonderHome, WonderJobs, WonderArk or WonderID.",
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ interest?: string }> }) {
  const { interest: raw } = await searchParams;
  const interest = raw === "wonderagent" ? "wonderid" : raw;
  const valid = startups.some((s) => s.slug === interest) ? interest : undefined;
  return (
    <section className="theme-light bg-bg-soft text-fg">
      <div className="container grid gap-12 pt-[calc(var(--nav-h)+4rem)] pb-24 lg:grid-cols-12 lg:gap-16">
        <Reveal className="lg:col-span-5">
          <p className="eyebrow text-accent">Contact</p>
          <h1 className="display balance mt-4 text-[clamp(2.5rem,6vw,4.5rem)]">Let&apos;s talk.</h1>
          <p className="lede mt-6 text-lg text-fg-muted">
            Every message goes straight to the founder&apos;s inbox — not a CRM, not an SDR. Tell us what you invest in or build, which product caught your eye, and how you&apos;d like to proceed. Decks, trackers, code access and live walkthroughs are available on request.
          </p>
          <dl className="mt-10 grid gap-5 text-sm">
            <div>
              <dt className="font-semibold">Investors</dt>
              <dd className="mt-1 text-fg-muted">Early-stage conversations across all four products, together or individually.</dd>
            </div>
            <div>
              <dt className="font-semibold">Design partners &amp; customers</dt>
              <dd className="mt-1 text-fg-muted">Families for WonderHome, enterprises governing people, machines and AI agents for WonderID, field-service and distribution businesses for WonderArk, career services for WonderJobs.</dd>
            </div>
            <div>
              <dt className="font-semibold">Response time</dt>
              <dd className="mt-1 text-fg-muted">A personal reply within two working days.</dd>
            </div>
          </dl>
          <div className="mt-8">
            <p className="text-sm font-semibold">Prefer email?</p>
            <p className="mt-1 text-sm text-fg-muted">Reaches the same inbox as the form below.</p>
            <EmailCTA name={site.name} tone="outline" className="mt-3" />
          </div>
        </Reveal>
        <Reveal delay={0.1} className="lg:col-span-7">
          <Suspense>
            <ContactForm defaultInterest={valid} />
          </Suspense>
        </Reveal>
      </div>
    </section>
  );
}
