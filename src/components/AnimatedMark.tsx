import Image from "next/image";

/**
 * The butterfly-W mark split into two wings that flap once every five seconds.
 * Each wing rotates in 3D about the centre seam; the halves are equal-width
 * crops of the same artwork, so at rest they read as the single static mark.
 * Disabled under prefers-reduced-motion (see globals.css).
 */
export function AnimatedMark({ className = "h-5", priority = false }: { className?: string; priority?: boolean }) {
  return (
    <span className={`mark-flap relative inline-block aspect-[1.454] ${className}`} aria-hidden>
      <Image src="/brands/wonderapps/mark-left.webp" alt="" width={205} height={282} priority={priority} className="wing wing-left" />
      <Image src="/brands/wonderapps/mark-right.webp" alt="" width={205} height={282} priority={priority} className="wing wing-right" />
    </span>
  );
}
