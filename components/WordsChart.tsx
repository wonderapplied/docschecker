import { clock } from "@/lib/format";

type Point = { t: string; value: number };

/**
 * Words (or sentences) added over time against the goal. With a deadline, a dashed pace line runs from
 * the start to the goal at the deadline: stay above it and you finish on time.
 */
export default function WordsChart({
  points,
  goal,
  startedAt,
  deadline,
  unit = "words",
}: {
  points: Point[];
  goal: number;
  unit?: string;
  startedAt: string;
  deadline: string | null;
}) {
  const W = 640;
  const H = 220;
  const pad = { l: 44, r: 16, t: 14, b: 26 };
  const t0 = Date.parse(startedAt);
  const tLast = points.length ? Date.parse(points[points.length - 1].t) : t0;
  const tEnd = Math.max(tLast, deadline ? Date.parse(deadline) : 0, t0 + 10 * 60_000);
  const yMax = Math.max(goal, ...points.map((p) => p.value)) * 1.08;
  const x = (t: number) => pad.l + ((t - t0) / (tEnd - t0)) * (W - pad.l - pad.r);
  const y = (v: number) => H - pad.b - (Math.max(0, v) / yMax) * (H - pad.t - pad.b);

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(Date.parse(p.t)).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = points.length > 1 ? `${line} L${x(tLast).toFixed(1)},${y(0)} L${x(t0)},${y(0)} Z` : "";
  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${unit} added over time against the goal`}>
      <defs>
        <linearGradient id="wc-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--brand)" stopOpacity="0.28" />
          <stop offset="1" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* y axis: 0, half, goal */}
      {[0, goal / 2, goal].map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeDasharray={v === goal ? "0" : "2 4"} />
          <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted)" className="num">
            {Math.round(v).toLocaleString()}
          </text>
        </g>
      ))}
      <text x={pad.l + 6} y={y(goal) - 6} fontSize="11" fontWeight="700" fill="var(--good)">
        Goal · {goal.toLocaleString()} {unit}
      </text>
      {deadline && (
        <>
          <line x1={x(t0)} y1={y(0)} x2={x(Date.parse(deadline))} y2={y(goal)} stroke="var(--warn)" strokeWidth="1.5" strokeDasharray="5 5" />
          <line x1={x(Date.parse(deadline))} x2={x(Date.parse(deadline))} y1={pad.t} y2={y(0)} stroke="var(--warn)" strokeOpacity="0.5" />
          <text x={x(Date.parse(deadline)) - 8} y={y(goal * 0.2)} textAnchor="end" fontSize="11" fontWeight="700" fill="var(--warn)">
            Pace to finish by the deadline
          </text>
        </>
      )}
      {area && <path d={area} fill="url(#wc-fill)" />}
      {line && <path d={line} fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}
      {last && <circle cx={x(Date.parse(last.t))} cy={y(last.value)} r="5" fill="var(--brand)" stroke="var(--panel)" strokeWidth="2" />}
      {/* x axis: start, now, deadline */}
      <text x={pad.l} y={H - 6} fontSize="11" fill="var(--muted)">{clock(t0)}</text>
      {last && x(tLast) - pad.l > 70 && (!deadline || x(Date.parse(deadline)) - x(tLast) > 70) && (
        <text x={x(tLast)} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--muted)">{clock(tLast)}</text>
      )}
      {deadline && (
        <text x={x(Date.parse(deadline))} y={H - 6} textAnchor="end" fontSize="11" fill="var(--warn)">{clock(deadline)}</text>
      )}
    </svg>
  );
}
