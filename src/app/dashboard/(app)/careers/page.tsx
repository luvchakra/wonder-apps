import { CareersKeyForm } from "@/components/dashboard/CareersKeyForm";
import { keyStatus } from "@/lib/careers/key";
import { requireSession } from "@/lib/dashboard/session";

export const dynamic = "force-dynamic";

/** Where an admin pastes the WonderJobs career-site key. The page only ever receives the mask. */
export default async function CareersSettingsPage() {
  await requireSession();
  const status = await keyStatus();
  return (
    <div className="grid grid-cols-1 gap-8">
      <header className="dash-rise">
        <p className="dash-eyebrow">Careers</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">The careers page&apos;s connection.</h1>
        <p className="mt-2 max-w-2xl text-[15px]" style={{ color: "var(--d-ink-2)" }}>
          /careers shows the open jobs and takes applications through WonderJobs, which stores them, emails applicants and the hiring team, and deletes them on schedule.
          This site keeps nothing about applicants. Paste the career-site key from WonderJobs (Hiring → Jobs → Career sites → Add a career site → &quot;On our own website&quot;); it is shown there once.
        </p>
      </header>
      <CareersKeyForm initial={status} />
    </div>
  );
}
