import { Mail } from "lucide-react";
import { site } from "@/content/site";

const TONES = {
  /** Light surfaces — a quiet outlined pill (Showcase chapters). */
  outline: "ring-1 ring-fg/15 text-fg hover:bg-fg/5",
  /** Dark surfaces with a solid background (Footer). */
  ghostDark: "bg-fg/8 text-fg ring-1 ring-fg/15 hover:bg-fg/12",
  /** On a bright gradient CTA card (RoadmapAndAsk's "ask" box). */
  onGradient: "bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/20",
} as const;

/**
 * "Email {name}" as a pill button, not a printed address. The address only
 * ever appears in the `mailto:` href, so it can't be scraped straight off
 * the rendered page — clicking is the only way to see or copy it.
 */
export function EmailCTA({ name, tone = "outline", className = "" }: { name: string; tone?: keyof typeof TONES; className?: string }) {
  return (
    <a
      href={`mailto:${site.contactEmail}`}
      className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${TONES[tone]} ${className}`}
    >
      <Mail className="size-4" />
      Email {name}
    </a>
  );
}
