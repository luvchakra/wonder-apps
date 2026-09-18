import Link from "next/link";
import type { ComponentProps } from "react";

type ButtonProps = {
  href: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "lg";
  external?: boolean;
  className?: string;
  children: React.ReactNode;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-[transform,background-color,color,box-shadow] duration-300 will-change-transform hover:-translate-y-0.5 active:translate-y-0";
const sizes = { md: "h-11 px-5 text-[15px]", lg: "h-13 px-7 text-[17px]" };
const variants = {
  primary: "bg-fg text-bg shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)] hover:opacity-90",
  secondary: "bg-fg/6 text-fg ring-1 ring-fg/12 hover:bg-fg/10",
  ghost: "text-accent hover:underline underline-offset-4",
};

export function Button({ href, variant = "primary", size = "md", external, className = "", children }: ButtonProps) {
  const cls = `${base} ${sizes[size]} ${variants[variant]} ${className}`;
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

export function Eyebrow({ children, style, className = "" }: ComponentProps<"p">) {
  return (
    <p className={`eyebrow text-fg-subtle ${className}`} style={style}>
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = "left",
  accent,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  align?: "left" | "center";
  accent?: string;
}) {
  return (
    <div className={`max-w-3xl ${align === "center" ? "mx-auto text-center" : ""}`}>
      {eyebrow ? (
        <Eyebrow className="mb-4" style={accent ? { color: accent } : undefined}>
          {eyebrow}
        </Eyebrow>
      ) : null}
      <h2 className="headline balance text-[clamp(2rem,5vw,3.5rem)]">{title}</h2>
      {lede ? <p className="lede mt-5 text-[clamp(1.0625rem,1.6vw,1.375rem)] text-fg-muted">{lede}</p> : null}
    </div>
  );
}
