import type { Screenshot } from "@/content/types";
import { Device } from "./Device";
import { Parallax } from "./Parallax";

/**
 * One laptop and (at most) one phone, side by side. They never overlap, so no
 * screenshot copy is ever covered, and the parallax drift is small enough that
 * neither can reach the text around them.
 */
export function DevicePair({
  desktop,
  mobile,
  flip = false,
  priority = false,
  sizes = "(min-width: 1024px) 640px, 80vw",
  className = "",
}: {
  desktop: Screenshot;
  mobile?: Screenshot;
  flip?: boolean;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-end gap-4 sm:gap-6 ${flip ? "flex-row-reverse" : ""} ${className}`}>
      <Parallax speed={0.05} className="min-w-0 flex-1">
        <Device shot={desktop} priority={priority} sizes={sizes} />
      </Parallax>
      {mobile ? (
        <Parallax speed={-0.07} className="w-[22%] max-w-[180px] shrink-0">
          <Device shot={mobile} priority={priority} sizes="180px" />
        </Parallax>
      ) : null}
    </div>
  );
}
