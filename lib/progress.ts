export type Goal = { goalWords: number | null; goalSentences: number | null };
export type Status = "idle" | "writing" | "almost" | "unlocked";

export const ALMOST_THERE = 0.75;

/** 0–1. With both goals set, you need both, so the slower one decides. */
export function fraction(goal: Goal, wordsAdded: number, sentencesAdded: number): number {
  const parts: number[] = [];
  if (goal.goalWords) parts.push(Math.max(0, wordsAdded) / goal.goalWords);
  if (goal.goalSentences) parts.push(Math.max(0, sentencesAdded) / goal.goalSentences);
  if (!parts.length) return 0;
  return Math.min(1, ...parts);
}

export function status(frac: number, unlocked: boolean): Status {
  if (unlocked || frac >= 1) return "unlocked";
  if (frac >= ALMOST_THERE) return "almost";
  return "writing";
}

export const STATUS_LABEL: Record<Status, string> = {
  idle: "Not writing",
  writing: "Writing",
  almost: "Almost there",
  unlocked: "Unlocked",
};
