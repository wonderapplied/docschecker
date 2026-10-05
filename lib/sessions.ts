import "server-only";
import { addedWords, isPaste, junkFlags, type Flag } from "./anticheat";
import { count, extractText, wordFrequencies } from "./count";
import { sendUnlockPing } from "./discord";
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
  flags: Flag[];
  started_at: string;
  unlocked_at: string | null;
  ended_at: string | null;
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
  discountedWords: number;
  percent: number;
  status: Status;
  flags: Flag[];
  snapshots: { t: string; words: number; sentences: number }[];
};

type UserRow = { id: string; name: string | null; avatar: string | null; discord_id: string | null };

function progressOf(s: SessionRow) {
  const wordsAdded = s.last_words - s.baseline_words - s.discounted_words;
  const sentencesAdded = s.last_sentences - s.baseline_sentences;
  const frac = fraction({ goalWords: s.goal_words, goalSentences: s.goal_sentences }, wordsAdded, sentencesAdded);
  return { wordsAdded, sentencesAdded, frac, status: status(frac, !!s.unlocked_at) };
}

async function writeLobby(s: SessionRow, user: UserRow) {
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
    flags: s.flags,
    deadline: s.deadline,
    started_at: s.started_at,
    unlocked_at: s.unlocked_at,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function getUser(userId: string): Promise<UserRow> {
  const { data, error } = await db()
    .from("users")
    .select("id, name, avatar, discord_id")
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

export async function toView(s: SessionRow): Promise<SessionView> {
  const { data: snaps, error } = await db()
    .from("snapshots")
    .select("words, sentences, taken_at")
    .eq("session_id", s.id)
    .order("taken_at", { ascending: true })
    .limit(500);
  if (error) throw error;
  const p = progressOf(s);
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
    discountedWords: s.discounted_words,
    percent: Math.floor(p.frac * 100),
    status: p.status,
    flags: s.flags,
    snapshots: (snaps ?? []).map((r) => ({
      t: r.taken_at,
      words: r.words - s.baseline_words,
      sentences: r.sentences - s.baseline_sentences,
    })),
  };
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

export async function pollSession(s: SessionRow, accessToken: string): Promise<SessionRow> {
  const now = new Date();
  const gapSeconds = (now.getTime() - new Date(s.last_polled_at).getTime()) / 1000;
  if (gapSeconds < MIN_POLL_SECONDS) return s;

  const text = extractText(await getDoc(s.doc_id, accessToken));
  const c = count(text);
  const wordDelta = c.words - s.last_words;

  const pasted = isPaste(wordDelta, gapSeconds);
  const discount = pasted && process.env.PASTE_MODE === "discount" ? wordDelta : 0;
  // "pasted" sticks for the session; junk flags are recomputed so cleaning up clears them.
  const flags: Flag[] = [
    ...(pasted || s.flags.includes("pasted") ? (["pasted"] as const) : []),
    ...junkFlags(addedWords(s.baseline_freq, wordFrequencies(text))),
  ];

  const next: SessionRow = {
    ...s,
    last_words: c.words,
    last_sentences: c.sentences,
    last_polled_at: now.toISOString(),
    discounted_words: s.discounted_words + discount,
    flags,
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
  await writeLobby(next, user);
  if (justUnlocked) await sendUnlockPing(user.name ?? "Someone", user.discord_id);
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
