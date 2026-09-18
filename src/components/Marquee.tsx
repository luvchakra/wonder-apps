export function Marquee({ items, className = "" }: { items: string[]; className?: string }) {
  const row = [...items, ...items];
  return (
    <div className={`marquee relative overflow-hidden py-6 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)] ${className}`} aria-hidden>
      <div className="marquee-track gap-10">
        {row.map((t, i) => (
          <span key={i} className="whitespace-nowrap text-[15px] font-medium tracking-tight text-fg-muted">
            <span className="mr-10 inline-block size-1.5 rounded-full bg-accent align-middle" />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
