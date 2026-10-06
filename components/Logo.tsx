/** Padlock mark. `open` lifts and swings the shackle; it animates when the prop changes. */
export default function Logo({ size = 28, open = false, className = "" }: { size?: number; open?: boolean; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      <g
        style={{
          transformOrigin: "22px 15px",
          transform: open ? "translateY(-3px) rotate(28deg)" : "none",
          transition: "transform 500ms cubic-bezier(0.3, 1.6, 0.5, 1)",
        }}
      >
        <path d="M10 15V10.5a6 6 0 0 1 12 0V15" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
      </g>
      <rect x="5" y="14" width="22" height="16" rx="5" fill="currentColor" />
      <circle cx="16" cy="21" r="2.4" fill="var(--bg)" />
      <rect x="15" y="22" width="2" height="4" rx="1" fill="var(--bg)" />
    </svg>
  );
}

export function Wordmark({ open = false }: { open?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 font-display text-xl font-extrabold tracking-tight">
      <Logo open={open} className="text-brand" />
      Unlocked
    </span>
  );
}
