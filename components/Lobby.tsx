"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ProgressBar from "./ProgressBar";
import { FLAG_LABEL, type LobbyRow } from "./types";
import { STATUS_LABEL } from "@/lib/progress";

const STATUS_STYLE: Record<LobbyRow["status"], string> = {
  idle: "bg-line text-muted",
  writing: "bg-accent/20 text-accent",
  almost: "bg-warn/20 text-warn",
  unlocked: "bg-good/20 text-good",
};

let tokenCache: { token: string; expiresAt: number } | null = null;
async function realtimeToken() {
  if (tokenCache && tokenCache.expiresAt - Date.now() > 5 * 60_000) return tokenCache.token;
  const res = await fetch("/api/realtime-token");
  if (!res.ok) throw new Error("realtime token");
  tokenCache = await res.json();
  return tokenCache!.token;
}

export default function Lobby() {
  const [me, setMe] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, LobbyRow>>({});
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [notif, setNotif] = useState<NotificationPermission | "unsupported">("default");
  const meRef = useRef<string | null>(null);
  const rowsRef = useRef<Record<string, LobbyRow>>({});

  useEffect(() => {
    setNotif(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
    fetch("/api/lobby")
      .then((r) => r.json())
      .then((d: { me: string; rows: LobbyRow[] }) => {
        setMe(d.me);
        meRef.current = d.me;
        rowsRef.current = { ...Object.fromEntries(d.rows.map((r) => [r.user_id, r])), ...rowsRef.current };
        setRows(rowsRef.current);
        setLoaded(true);
      });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return;
    const supabase = createClient(url, anon, { accessToken: realtimeToken });
    // RLS on lobby_status limits these events to you and your friends.
    const channel = supabase
      .channel("lobby")
      .on("postgres_changes", { event: "*", schema: "public", table: "lobby_status" }, (payload) => {
        const row = payload.new as LobbyRow;
        if (!row?.user_id) return;
        const before = rowsRef.current[row.user_id];
        if (row.status === "unlocked" && before?.status !== "unlocked" && row.user_id !== meRef.current) {
          announce(`${row.name ?? "A friend"} is unlocked. Hop on!`);
        }
        rowsRef.current = { ...rowsRef.current, [row.user_id]: row };
        setRows(rowsRef.current);
      })
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function announce(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 8000);
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification("🔓 Unlocked", { body: msg });
    }
  }

  const list = Object.values(rows).sort(
    (a, b) => Number(b.user_id === me) - Number(a.user_id === me) || b.percent - a.percent,
  );
  const unlocked = list.filter((r) => r.status === "unlocked");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Lobby</h1>
          <p className="text-sm text-muted">
            {unlocked.length ? `Ready to play: ${unlocked.map((r) => r.name ?? "?").join(", ")}` : "Nobody's unlocked yet."}
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {notif === "default" && (
            <button className="btn-ghost text-sm" onClick={() => Notification.requestPermission().then(setNotif)}>
              Turn on alerts
            </button>
          )}
          <span className={live ? "text-good" : "text-muted"}>{live ? "● Live" : "○ Connecting"}</span>
        </div>
      </div>

      {loaded && list.length <= 1 && (
        <p className="card text-muted">
          It&apos;s just you here. <Link href="/friends" className="text-accent underline">Invite friends</Link> to fill the lobby.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((r) => (
          <div key={r.user_id} className={`card space-y-3 ${r.status === "unlocked" ? "border-good" : ""}`}>
            <div className="flex items-center gap-3">
              {r.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.avatar} alt="" className="h-10 w-10 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <div className="grid h-10 w-10 place-items-center rounded-full bg-line">{(r.name ?? "?")[0]}</div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">
                  {r.name ?? "Friend"}
                  {r.user_id === me && <span className="text-muted"> (you)</span>}
                </div>
                {r.doc_title && <div className="truncate text-xs text-muted">{r.doc_title}</div>}
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status]}`}>
                {STATUS_LABEL[r.status]}
              </span>
            </div>
            {r.status !== "idle" && (
              <>
                <ProgressBar percent={r.percent} />
                <div className="flex flex-wrap justify-between gap-1 text-xs text-muted">
                  <span>
                    {r.goal_words ? `${Math.max(0, r.words_added)}/${r.goal_words} words` : ""}
                    {r.goal_words && r.goal_sentences ? " · " : ""}
                    {r.goal_sentences ? `${Math.max(0, r.sentences_added)}/${r.goal_sentences} sentences` : ""}
                  </span>
                  <span className="font-semibold text-text">{r.percent}%</span>
                </div>
                {r.flags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {r.flags.map((f) => (
                      <span key={f} className="rounded-full bg-warn/15 px-2 py-0.5 text-xs text-warn">
                        {FLAG_LABEL[f]}
                      </span>
                    ))}
                  </div>
                )}
                {r.deadline && !r.unlocked_at && (
                  <div className="text-xs text-muted">Deadline {new Date(r.deadline).toLocaleString()}</div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {toast && (
        <div className="fixed inset-x-4 bottom-6 mx-auto max-w-md rounded-2xl bg-good px-5 py-4 text-center font-semibold text-black shadow-xl">
          🔓 {toast}
        </div>
      )}
    </div>
  );
}
