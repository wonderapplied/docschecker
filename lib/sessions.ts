import "server-only";
import { addedWords, isPaste, junkFlags, type Flag } from "./anticheat";
import { count, extractText, wordFrequencies } from "./count";
import { sendUnlockPing } from "./discord";
import { dayKey, streak } from "./format";
import { getDoc } from "./google";
import { fraction, status, type Status } from "./progress";
import { db } from "./supabase";

/** Polls closer together than this reuse the last result instead of hitting Google. */
export const MIN_POLL_SECONDS = 20;

export type SessionRow = {
  id: string;
  user_id: string;
  doc_id: string;
  doc_title: string | null;
  show_title: boolean;
  goal_words: number | null;
  goal_sentences: number | null;
  deadline: string | null;
  baseline_words: number;
  baseline_sentences: number;
  baseline_freq: Record<string, number>;
  discounted_words: number;
  last_words: number;
  last_sentences: number;
  last_polled_at: string;
  flags: string[];
  started_at: string;
  unlocked_at: string | null;
  ended_at: string | null;
};

export type Stats = {
  /** Consecutive days with an unlock, ending today or yesterday. */
  streak: number;
  /** Fastest start-to-unlock time over all sessions, ms. */
  bestMs: number | null;
  /** This session's start-to-unlock time is the fastest yet. */
  isBest: boolean;
};

export type SessionView = {
  id: string;
  docId: string;
  docTitle: string | null;
  showTitle: boolean;
  goalWords: number | null;
  goalSentences: number | null;
  deadline: string | null;
  startedAt: string;
  unlockedAt: string | null;
  lastPolledAt: string;
  wordsAdded: number;
  sentencesAdded: number;
  /** Words that arrived faster than anyone types and were not counted. */
  pastedWords: number;
  percent: number;
  wordsPercent: number | null;
  sentencesPercent: number | null;
  status: Status;
  /** Junk checks; shown to the writer only. */
  flags: Flag[];
  stats: Stats;
  snapshots: { t: string; words: number; sentences: number }[];
};

type UserRow = {
  id: string;
  name: string | null;
  avatar: string | null;
  discord_id: string | null;
  discord_webhook_url: string | null;
};

const junkOnly = (flags: string[]) => flags.filter((f): f is Flag => f === "repetitive" || f === "lorem");

function progressOf(s: SessionRow) {
  const wordsAdded = s.last_words - s.baseline_words - s.discounted_words;
  const sentencesAdded = s.last_sentences - s.baseline_sentences;
  const frac = fraction({ goalWords: s.goal_words, goalSentences: s.goal_sentences }, wordsAdded, sentencesAdded);
  return { wordsAdded, sentencesAdded, frac, status: status(frac, !!s.unlocked_at) };
}

async function unlockHistory(userId: string) {
  const { data, error } = await db()
    .from("sessions")
    .select("id, started_at, unlocked_at")
    .eq("user_id", userId)
    .not("unlocked_at", "is", null);
  if (error) throw error;
  return (data ?? []) as { id: string; started_at: string; unlocked_at: string }[];
}

async function statsFor(s: SessionRow, timeZone: string): Promise<Stats> {
  const history = await unlockHistory(s.user_id);
  const today = dayKey(new Date(), timeZone);
  const times = history.map((h) => ({ id: h.id, ms: Date.parse(h.unlocked_at) - Date.parse(h.started_at) }));
  const bestMs = times.length ? Math.min(...times.map((t) => t.ms)) : null;
  const mine = times.find((t) => t.id === s.id);
  return {
    streak: streak(history.map((h) => dayKey(h.unlocked_at, timeZone)), today),
    bestMs,
    isBest: !!mine && times.length > 1 && mine.ms === bestMs,
  };
}

async function writeLobby(s: SessionRow, user: UserRow, extra: { streak?: number } = {}) {
  const p = progressOf(s);
  const { error } = await db().from("lobby_status").upsert({
    user_id: user.id,
    session_id: s.id,
    name: user.name,
    avatar: user.avatar,
    doc_title: s.show_title ? s.doc_title : null,
    words_added: p.wordsAdded,
    sentences_added: p.sentencesAdded,
    goal_words: s.goal_words,
    goal_sentences: s.goal_sentences,
    percent: Math.floor(p.frac * 100),
    status: p.status,
    // Friends see numbers only; paste and junk notes stay with the writer.
    flags: [],
    deadline: s.deadline,
    started_at: s.started_at,
    unlocked_at: s.unlocked_at,
    ...(s.unlocked_at ? { last_unlocked_at: s.unlocked_at } : {}),
    ...(extra.streak !== undefined ? { streak: extra.streak } : {}),
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function getUser(userId: string): Promise<UserRow> {
  const { data, error } = await db()
    .from("users")
    .select("id, name, avatar, discord_id, discord_webhook_url")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function getActiveSession(userId: string): Promise<SessionRow | null> {
  const { data, error } = await db()
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function toView(s: SessionRow, timeZone = "UTC"): Promise<SessionView> {
  const [{ data: snaps, error }, stats] = await Promise.all([
    db()
      .from("snapshots")
      .select("words, sentences, flagged, taken_at")
      .eq("session_id", s.id)
      .order("taken_at", { ascending: true })
      .limit(500),
    statsFor(s, timeZone),
  ]);
  if (error) throw error;
  const p = progressOf(s);
  const pct = (v: number, goal: number | null) => (goal ? Math.floor((Math.max(0, v) / goal) * 100) : null);
  return {
    id: s.id,
    docId: s.doc_id,
    docTitle: s.doc_title,
    showTitle: s.show_title,
    goalWords: s.goal_words,
    goalSentences: s.goal_sentences,
    deadline: s.deadline,
    startedAt: s.started_at,
    unlockedAt: s.unlocked_at,
    lastPolledAt: s.last_polled_at,
    wordsAdded: p.wordsAdded,
    sentencesAdded: p.sentencesAdded,
    pastedWords: s.discounted_words,
    percent: Math.floor(p.frac * 100),
    wordsPercent: pct(p.wordsAdded, s.goal_words),
    sentencesPercent: pct(p.sentencesAdded, s.goal_sentences),
    status: p.status,
    flags: junkOnly(s.flags),
    stats,
    snapshots: graphPoints(s, snaps ?? []),
  };
}

/** Words added over time, with pasted chunks taken off so the line matches what counts. */
function graphPoints(s: SessionRow, rows: { words: number; sentences: number; flagged: string | null; taken_at: string }[]) {
  let prev = s.baseline_words;
  let pasted = 0;
  return rows.map((r) => {
    if (r.flagged === "pasted") pasted += r.words - prev;
    prev = r.words;
    return { t: r.taken_at, words: r.words - s.baseline_words - pasted, sentences: r.sentences - s.baseline_sentences };
  });
}

export type StartInput = {
  docId: string;
  docTitle: string | null;
  showTitle: boolean;
  goalWords: number | null;
  goalSentences: number | null;
  deadline: string | null;
};

export async function startSession(userId: string, accessToken: string, input: StartInput) {
  // Reading the doc first proves we have access and gives the baseline.
  const doc = await getDoc(input.docId, accessToken);
  const text = extractText(doc);
  const c = count(text);

  await db()
    .from("sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("ended_at", null);

  const { data: s, error } = await db()
    .from("sessions")
    .insert({
      user_id: userId,
      doc_id: input.docId,
      doc_title: input.docTitle ?? doc.title ?? null,
      show_title: input.showTitle,
      goal_words: input.goalWords,
      goal_sentences: input.goalSentences,
      deadline: input.deadline,
      baseline_words: c.words,
      baseline_sentences: c.sentences,
      baseline_freq: wordFrequencies(text),
      last_words: c.words,
      last_sentences: c.sentences,
    })
    .select("*")
    .single();
  if (error) throw error;

  await db().from("snapshots").insert({ session_id: s.id, words: c.words, sentences: c.sentences });
  await writeLobby(s, await getUser(userId));
  return s as SessionRow;
}

export async function pollSession(s: SessionRow, accessToken: string, timeZone = "UTC"): Promise<SessionRow> {
  const now = new Date();
  const gapSeconds = (now.getTime() - new Date(s.last_polled_at).getTime()) / 1000;
  if (gapSeconds < MIN_POLL_SECONDS) return s;

  const text = extractText(await getDoc(s.doc_id, accessToken));
  const c = count(text);
  const wordDelta = c.words - s.last_words;
  const pasted = isPaste(wordDelta, gapSeconds);

  const next: SessionRow = {
    ...s,
    last_words: c.words,
    last_sentences: c.sentences,
    last_polled_at: now.toISOString(),
    discounted_words: s.discounted_words + (pasted ? wordDelta : 0),
    flags: junkFlags(addedWords(s.baseline_freq, wordFrequencies(text))),
  };
  const justUnlocked = !s.unlocked_at && progressOf(next).frac >= 1;
  if (justUnlocked) next.unlocked_at = now.toISOString();

  const { error } = await db()
    .from("sessions")
    .update({
      last_words: next.last_words,
      last_sentences: next.last_sentences,
      last_polled_at: next.last_polled_at,
      discounted_words: next.discounted_words,
      flags: next.flags,
      unlocked_at: next.unlocked_at,
    })
    .eq("id", s.id);
  if (error) throw error;

  await db()
    .from("snapshots")
    .insert({ session_id: s.id, words: c.words, sentences: c.sentences, flagged: pasted ? "pasted" : null });

  const user = await getUser(s.user_id);
  if (justUnlocked) {
    const { streak } = await statsFor(next, timeZone);
    await writeLobby(next, user, { streak });
    await sendUnlockPing(user, Date.parse(next.unlocked_at!) - Date.parse(next.started_at));
  } else {
    await writeLobby(next, user);
  }
  return next;
}

export async function endSession(userId: string) {
  await db()
    .from("sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("ended_at", null);
  await db()
    .from("lobby_status")
    .update({ status: "idle", session_id: null, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
}
