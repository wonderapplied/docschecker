export default function ProgressBar({ percent }: { percent: number }) {
  const p = Math.max(0, Math.min(100, percent));
  const color = p >= 100 ? "bg-good" : p >= 75 ? "bg-warn" : "bg-accent";
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${p}%` }} />
    </div>
  );
}
