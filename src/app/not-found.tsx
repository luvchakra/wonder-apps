import Link from "next/link";

export default function NotFound() {
  return (
    <section className="theme-dark grid min-h-[70vh] place-items-center bg-bg text-fg">
      <div className="container text-center">
        <p className="eyebrow text-fg-subtle">404</p>
        <h1 className="display mt-4 text-[clamp(2.5rem,7vw,5rem)]">That page isn&apos;t in the portfolio.</h1>
        <Link href="/" className="mt-8 inline-flex rounded-full bg-fg px-6 py-3 font-medium text-bg">
          Back to WonderApps
        </Link>
      </div>
    </section>
  );
}
