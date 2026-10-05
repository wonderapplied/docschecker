export default function ProgressRing({ percent, size = 220, label }: { percent: number; size?: number; label?: string }) {
  const stroke = Math.max(8, size / 14);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent));
  const color = p >= 100 ? "var(--good)" : p >= 75 ? "var(--warn)" : "var(--accent)";
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p / 100)}
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-extrabold" style={{ fontSize: size / 4.5 }}>
          {p >= 100 ? "🔓" : `${p}%`}
        </div>
        {label && <div className="text-sm text-muted">{label}</div>}
      </div>
    </div>
  );
}
