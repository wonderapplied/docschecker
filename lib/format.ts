// Time formatting without seconds: "7:57 PM", "Today, 9:32 PM", "1h 12m".

export function clock(iso: string | number | Date): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function dayAndTime(iso: string | number | Date, now = new Date()): string {
  const d = new Date(iso);
  const days = Math.round((startOfDay(d) - startOfDay(now)) / 86_400_000);
  const day =
    days === 0 ? "Today" : days === 1 ? "Tomorrow" : days === -1 ? "Yesterday" : d.toLocaleDateString([], { month: "short", day: "numeric" });
  return `${day}, ${clock(d)}`;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function duration(ms: number): string {
  const m = Math.max(0, Math.round(ms / 60_000));
  if (m < 60) return `${m}m`;
  return m % 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${Math.floor(m / 60)}h`;
}

export function ago(iso: string | number | Date, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  const days = Math.floor(s / 86_400);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

/** Calendar-day key in a time zone, for streaks. */
export function dayKey(iso: string | Date, timeZone: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-CA", { timeZone });
  } catch {
    return new Date(iso).toISOString().slice(0, 10);
  }
}

/** Consecutive days, ending today or yesterday, that have at least one unlock. */
export function streak(unlockDays: string[], today: string): number {
  const days = new Set(unlockDays);
  const step = (key: string) => {
    const d = new Date(`${key}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  };
  let cursor = days.has(today) ? today : step(today);
  let n = 0;
  while (days.has(cursor)) {
    n++;
    cursor = step(cursor);
  }
  return n;
}
