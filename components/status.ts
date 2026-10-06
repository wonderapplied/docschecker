import { ALMOST_THERE, type Status } from "@/lib/progress";

// One color per status, everywhere: ring, bar, pill.
export const STATUS_COLOR: Record<Status, string> = {
  idle: "var(--line)",
  writing: "var(--brand)",
  almost: "var(--warn)",
  unlocked: "var(--good)",
};

export const STATUS_PILL: Record<Status, string> = {
  idle: "bg-panel-2 text-muted",
  writing: "bg-brand/15 text-brand",
  almost: "bg-warn/15 text-warn",
  unlocked: "bg-good/15 text-good",
};

export const ALMOST_PERCENT = Math.round(ALMOST_THERE * 100);
