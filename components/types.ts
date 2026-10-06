import type { Flag } from "@/lib/anticheat";
import type { Status } from "@/lib/progress";

export type { SessionView } from "@/lib/sessions";

export type LobbyRow = {
  user_id: string;
  name: string | null;
  avatar: string | null;
  doc_title: string | null;
  words_added: number;
  sentences_added: number;
  goal_words: number | null;
  goal_sentences: number | null;
  percent: number;
  status: Status;
  streak: number;
  deadline: string | null;
  started_at: string | null;
  unlocked_at: string | null;
  last_unlocked_at: string | null;
  updated_at: string;
};

export const FLAG_NOTE: Record<Flag, string> = {
  repetitive: "A lot of repeated words lately. Friends don't see this.",
  lorem: "That looks like lorem ipsum. Friends don't see this.",
};
