import type { Status } from "@/lib/progress";
import { STATUS_COLOR } from "./status";

export default function ProgressBar({ percent, status }: { percent: number; status: Status }) {
  const p = Math.max(0, Math.min(100, percent));
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-panel-2" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p}%`, background: STATUS_COLOR[status] }} />
    </div>
  );
}
