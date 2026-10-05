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
  flags: Flag[];
  deadline: string | null;
  started_at: string | null;
  unlocked_at: string | null;
  updated_at: string;
};

export const FLAG_LABEL: Record<Flag, string> = {
  pasted: "pasted?",
  repetitive: "repetitive",
  lorem: "lorem ipsum",
};
