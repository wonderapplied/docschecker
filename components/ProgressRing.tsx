import type { Status } from "@/lib/progress";
import Logo from "./Logo";
import { STATUS_COLOR } from "./status";

export default function ProgressRing({
  percent,
  status,
  size = 220,
  label,
}: {
  percent: number;
  status: Status;
  size?: number;
  label?: string;
}) {
  const stroke = Math.max(10, size / 12);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent));
  const color = STATUS_COLOR[status];
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--panel-2)" strokeWidth={stroke} />
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
          style={{ transition: "stroke-dashoffset 700ms ease, stroke 300ms" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center text-center">
        {status === "unlocked" ? (
          <Logo open size={size / 3} className="text-good" />
        ) : (
          <span className="num font-display font-extrabold leading-none" style={{ fontSize: size / 4.2 }}>
            {p}
            <span style={{ fontSize: size / 9 }}>%</span>
          </span>
        )}
        {label && <span className="mt-1 font-display text-base font-bold" style={{ color }}>{label}</span>}
      </div>
    </div>
  );
}
