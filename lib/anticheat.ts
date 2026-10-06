// Checks that run on every poll. Deletions need no check: progress is a net count, so typing
// and deleting earns nothing.

/** A jump has to be at least this many words to count as a paste. */
export const PASTE_MIN_WORDS = 50;
/** ...and faster than this. Fast typists sustain ~80 wpm while composing; 120 leaves headroom. */
export const PASTE_WPM = 120;
const JUNK_MIN_WORDS = 50;
const LOREM = new Set([
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit", "sed", "eiusmod",
  "tempor", "incididunt", "labore", "dolore", "magna", "aliqua",
]);

export type Flag = "repetitive" | "lorem";

/**
 * Words that arrived faster than anyone types are treated as pasted and don't count. Polls are
 * ~45s apart while the tab is open; after a longer gap (laptop asleep) the allowance grows with it.
 */
export function isPaste(wordDelta: number, secondsSinceLastPoll: number): boolean {
  const minutes = Math.max(20, secondsSinceLastPoll) / 60;
  return wordDelta >= PASTE_MIN_WORDS && wordDelta > PASTE_WPM * minutes;
}

/** Words present now but not at the baseline, as a frequency map. */
export function addedWords(
  baseline: Record<string, number>,
  current: Record<string, number>,
): Record<string, number> {
  const added: Record<string, number> = {};
  for (const [w, n] of Object.entries(current)) {
    const d = n - (baseline[w] ?? 0);
    if (d > 0) added[w] = d;
  }
  return added;
}

/** "the the the" and lorem ipsum checks over the words added this session. Shown to the writer only. */
export function junkFlags(added: Record<string, number>): Flag[] {
  const total = Object.values(added).reduce((a, b) => a + b, 0);
  if (total < JUNK_MIN_WORDS) return [];
  const flags: Flag[] = [];
  const unique = Object.keys(added).length;
  const top = Math.max(...Object.values(added));
  // Normal prose of 50+ words has a unique/total ratio well above 0.3, and no single word
  // takes more than ~10% of it.
  if (unique / total < 0.3 || top / total > 0.2) flags.push("repetitive");
  let lorem = 0;
  for (const w of LOREM) lorem += added[w] ?? 0;
  if (lorem / total > 0.1) flags.push("lorem");
  return flags;
}
