"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

/** Native share sheet where there is one, otherwise copies the link. */
export function ShareButton({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* dismissed */
    }
  }
  return (
    <button type="button" onClick={share} className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-5 text-sm font-medium text-fg transition-colors hover:bg-fg/5">
      {copied ? <Check className="size-4" aria-hidden /> : <Share2 className="size-4" aria-hidden />}
      <span aria-live="polite">{copied ? "Link copied" : "Share"}</span>
    </button>
  );
}
