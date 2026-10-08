import Image from "next/image";
import type { Screenshot } from "@/content/types";

/** A screenshot in a device frame. Screenshots of any aspect are cropped from the top. */
export function Device({ shot, priority = false, className = "", sizes }: { shot: Screenshot; priority?: boolean; className?: string; sizes?: string }) {
  const phone = shot.kind === "mobile";
  const frame = phone ? "device-phone" : "device-laptop";
  const defaultSizes = shot.kind === "desktop" ? "(min-width: 1024px) 720px, 92vw" : "(min-width: 1024px) 260px, 45vw";
  return (
    <figure className={`${frame} ${className}`}>
      {phone ? (
        <>
          <span aria-hidden className="phone-btn phone-btn-r" />
          <span aria-hidden className="phone-btn phone-btn-l1" />
          <span aria-hidden className="phone-btn phone-btn-l2" />
          <span aria-hidden className="phone-btn phone-btn-l3" />
        </>
      ) : null}
      <div className="screen relative">
        {phone ? (
          <>
            <span aria-hidden className="phone-status">
              <span>9:41</span>
              <span className="phone-battery" />
            </span>
            <span aria-hidden className="phone-island" />
            <span aria-hidden className="phone-home" />
          </>
        ) : null}
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
