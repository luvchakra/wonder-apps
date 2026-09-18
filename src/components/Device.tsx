import Image from "next/image";
import type { Screenshot } from "@/content/types";

/** A screenshot in a device frame. Screenshots of any aspect are cropped from the top. */
export function Device({ shot, priority = false, className = "", sizes }: { shot: Screenshot; priority?: boolean; className?: string; sizes?: string }) {
  const frame = shot.kind === "desktop" ? "device-laptop" : "device-phone";
  const defaultSizes = shot.kind === "desktop" ? "(min-width: 1024px) 720px, 92vw" : "(min-width: 1024px) 260px, 45vw";
  return (
    <figure className={`${frame} ${className}`}>
      <div className="screen relative">
        <Image
          src={shot.src}
          alt={shot.alt}
          fill
          sizes={sizes ?? defaultSizes}
          priority={priority}
          className="object-cover object-top"
        />
      </div>
      {shot.caption ? <figcaption className="sr-only">{shot.caption}</figcaption> : null}
    </figure>
  );
}

export function Caption({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-center text-sm text-fg-subtle">{children}</p>;
}
