import Image from "next/image";

/** The WonderApps butterfly-W mark. Gradient artwork reads on light and dark alike. */
export function Logo({ className = "h-6 w-auto", priority = false }: { className?: string; priority?: boolean }) {
  return <Image src="/brands/wonderapps/mark.png" alt="" width={417} height={282} className={className} priority={priority} />;
}

/** "Wonder" heavy, "Apps" light — the wordmark as set on the brand sheet. */
export function Wordmark({ className = "text-[15px]" }: { className?: string }) {
  return (
    <span className={`tracking-tight ${className}`}>
      <span className="font-bold">Wonder</span>
      <span className="font-light">Apps</span>
    </span>
  );
}
