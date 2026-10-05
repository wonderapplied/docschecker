type Point = { t: string; words: number };

/** Words added over time, plus words-per-minute over the last ~5 minutes. */
export default function Sparkline({ points, goal }: { points: Point[]; goal: number | null }) {
  if (points.length < 2) return <p className="text-sm text-muted">The graph appears after a couple of polls.</p>;
  const w = 600;
  const h = 140;
  const t0 = Date.parse(points[0].t);
  const t1 = Date.parse(points[points.length - 1].t);
  const maxY = Math.max(goal ?? 0, ...points.map((p) => p.words), 1);
  const x = (t: string) => ((Date.parse(t) - t0) / Math.max(1, t1 - t0)) * w;
  const y = (v: number) => h - (Math.max(0, v) / maxY) * h;
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.words).toFixed(1)}`).join(" ");

  const last = points[points.length - 1];
  const windowStart = [...points].reverse().find((p) => Date.parse(last.t) - Date.parse(p.t) >= 5 * 60_000) ?? points[0];
  const mins = (Date.parse(last.t) - Date.parse(windowStart.t)) / 60_000;
  const wpm = mins > 0 ? Math.max(0, Math.round((last.words - windowStart.words) / mins)) : 0;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between text-sm text-muted">
        <span>Words added</span>
        <span>
          <span className="text-2xl font-bold text-text">{wpm}</span> wpm
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-36 w-full" preserveAspectRatio="none" aria-label="Words added over time">
        {goal && <line x1={0} x2={w} y1={y(goal)} y2={y(goal)} stroke="var(--good)" strokeDasharray="6 6" strokeWidth={1.5} />}
        <path d={d} fill="none" stroke="var(--accent)" strokeWidth={3} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}
