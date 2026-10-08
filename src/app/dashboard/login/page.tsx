import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/dashboard/LoginForm";
import { Logo, Wordmark } from "@/components/Logo";
import { getSession } from "@/lib/dashboard/session";

export const metadata: Metadata = { title: "Sign in · Founder dashboard", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  expired: "That sign-in link has expired or isn't valid. Request a new one.",
  browser: "Open the link in the same browser you asked from, or request a new one here.",
  denied: "That address doesn't have access.",
  slow: "Too many attempts. Wait a few minutes and try again.",
  config: "Sign-in isn't configured on this deployment.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  if (await getSession()) redirect("/dashboard");
  const { e } = await searchParams;
  return (
    <div className="dash grid min-h-dvh place-items-center px-4 py-10" style={{ backgroundImage: "radial-gradient(900px 500px at 50% -10%, rgba(144,133,233,0.16), transparent 60%), radial-gradient(700px 400px at 100% 100%, rgba(25,158,112,0.1), transparent 60%)" }}>
      <div className="dash-card dash-rise w-full max-w-[400px] p-7 sm:p-9">
        <div className="mb-8 flex items-center gap-3">
          <Logo className="h-7 w-auto" />
          <div className="leading-tight">
            <Wordmark className="text-base" />
            <p className="dash-eyebrow" style={{ fontSize: 9 }}>Founder dashboard</p>
          </div>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mb-6 mt-2 text-sm leading-relaxed" style={{ color: "var(--d-ink-2)" }}>
          Access is limited to people the founder has approved. We email a one-time link; there is no password to guess.
        </p>
        {e && ERRORS[e] ? (
          <p role="alert" className="mb-5 rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(230,103,103,0.12)", color: "#f1a3a3" }}>
            {ERRORS[e]}
          </p>
        ) : null}
        <LoginForm />
      </div>
    </div>
  );
}
