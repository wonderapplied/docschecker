"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ago, clock } from "@/lib/format";
import { STATUS_LABEL, type Status } from "@/lib/progress";
import Avatar from "./Avatar";
import ProgressBar from "./ProgressBar";
import { ALMOST_PERCENT, STATUS_PILL } from "./status";
import type { LobbyRow } from "./types";

/** No update for this long while writing means the writer's tab is closed or hidden. */
const PAUSED_AFTER_MS = 2.5 * 60_000;

let tokenCache: { token: string; expiresAt: number } | null = null;
async function realtimeToken() {
  if (tokenCache && tokenCache.expiresAt - Date.now() > 5 * 60_000) return tokenCache.token;
  const res = await fetch("/api/realtime-token");
  if (!res.ok) throw new Error("realtime token");
  tokenCache = await res.json();
  return tokenCache!.token;
}

const ORDER: Record<Status, number> = { unlocked: 0, almost: 1, writing: 1, idle: 3 };

function isPaused(r: LobbyRow, now: number) {
  return (r.status === "writing" || r.status === "almost") && now - Date.parse(r.updated_at) > PAUSED_AFTER_MS;
}

export default function Lobby() {
  const [me, setMe] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, LobbyRow>>({});
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [connection, setConnection] = useState<"ok" | "lost">("ok");
  const [notif, setNotif] = useState<NotificationPermission | "unsupported">("unsupported");
  const [pinged, setPinged] = useState<Record<string, string>>({});
  const [now, setNow] = useState(() => Date.now());
  const meRef = useRef<string | null>(null);
  const rowsRef = useRef<Record<string, LobbyRow>>({});

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

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
          announce(`${row.name ?? "A friend"} unlocked · just now`);
        }
        rowsRef.current = { ...rowsRef.current, [row.user_id]: row };
        setRows(rowsRef.current);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setConnection("ok");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setConnection("lost");
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function announce(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 8000);
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification("Unlocked", { body: msg });
    }
  }

  async function ping(r: LobbyRow) {
    setPinged((p) => ({ ...p, [r.user_id]: "Pinging…" }));
    const res = await fetch("/api/ping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendId: r.user_id }),
    });
    const json = await res.json().catch(() => ({}));
    setPinged((p) => ({ ...p, [r.user_id]: res.ok ? "Pinged on Discord" : (json.error ?? "Couldn't ping") }));
  }

  const list = Object.values(rows).sort(
    (a, b) =>
      ORDER[a.status] + Number(isPaused(a, now)) - (ORDER[b.status] + Number(isPaused(b, now))) ||
      b.percent - a.percent ||
      (a.name ?? "").localeCompare(b.name ?? ""),
  );
  const ready = list.filter((r) => r.status === "unlocked" && r.user_id !== me);
  const meReady = list.some((r) => r.user_id === me && r.status === "unlocked");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Lobby</h1>
          <p className="mt-1 text-sm text-muted">
            <Legend status="writing" /> under {ALMOST_PERCENT}% · <Legend status="almost" /> {ALMOST_PERCENT}%+ · <Legend status="unlocked" /> goal hit
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {connection === "lost" && <span className="text-warn">Reconnecting…</span>}
          {notif === "default" && (
            <button className="btn-ghost text-sm" onClick={() => Notification.requestPermission().then(setNotif)}>
              Turn on alerts
            </button>
          )}
        </div>
      </div>

      {ready.length > 0 && (
        <section className="animate-slide-up flex flex-col gap-4 rounded-3xl bg-good px-5 py-5 text-[#04180c] sm:flex-row sm:items-center sm:px-6">
          <div className="flex -space-x-3">
            {ready.slice(0, 4).map((r) => (
              <span key={r.user_id} className="rounded-full ring-4 ring-good">
                <Avatar src={r.avatar} name={r.name} size={48} />
              </span>
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-2xl font-extrabold leading-tight">
              {names(ready.map((r) => r.name ?? "A friend"))} {ready.length === 1 ? "is" : "are"} ready to play
            </p>
            <p className="text-sm font-medium opacity-80">
              {meReady ? "You're unlocked too. Go." : "Finish up and join them."}
              {ready.length === 1 && ready[0].unlocked_at && ` Unlocked ${ago(ready[0].unlocked_at, now)}.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {ready.map((r) => (
              <button
                key={r.user_id}
                onClick={() => ping(r)}
                disabled={!!pinged[r.user_id]}
                className="rounded-2xl bg-[#04180c] px-4 py-2.5 font-display font-bold text-good transition hover:brightness-125 disabled:opacity-70"
              >
                {pinged[r.user_id] ?? `Ping ${(r.name ?? "them").split(" ")[0]}`}
              </button>
            ))}
          </div>
        </section>
      )}

      {loaded && list.length <= 1 && (
        <p className="card text-muted">
          It&apos;s just you here.{" "}
          <Link href="/friends" className="font-semibold text-brand hover:underline">
            Invite friends
          </Link>{" "}
          to fill the lobby.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((r) => (
          <Card key={r.user_id} r={r} isMe={r.user_id === me} now={now} />
        ))}
      </div>

      {toast && (
        <div role="status" className="animate-slide-up fixed inset-x-4 bottom-24 z-40 mx-auto flex max-w-sm items-center gap-3 rounded-2xl bg-good px-5 py-4 font-display font-bold text-[#04180c] shadow-2xl sm:bottom-6">
          <span className="text-xl" aria-hidden>🔓</span> {toast}
        </div>
      )}
    </div>
  );
}

function names(list: string[]) {
  const first = list.map((n) => n.split(" ")[0]);
  if (first.length <= 2) return first.join(" and ");
  return `${first.slice(0, -1).join(", ")} and ${first[first.length - 1]}`;
}

function Legend({ status }: { status: Status }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_PILL[status]}`}>{STATUS_LABEL[status]}</span>;
}

function Card({ r, isMe, now }: { r: LobbyRow; isMe: boolean; now: number }) {
  const paused = isPaused(r, now);
  const active = r.status !== "idle";
  return (
    <article className={`card flex flex-col gap-4 ${r.status === "unlocked" ? "border-good/60" : ""} ${paused || !active ? "opacity-80" : ""}`}>
      <div className="flex items-start gap-3">
        <Avatar src={r.avatar} name={r.name} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-display text-lg font-bold leading-tight">{r.name ?? "Friend"}</span>
            {isMe && <span className="rounded-md bg-panel-2 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-muted">You</span>}
          </div>
          {r.doc_title && active && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{r.doc_title}</p>}
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${paused ? "bg-panel-2 text-muted" : STATUS_PILL[r.status]}`}>
          {paused ? "Paused" : STATUS_LABEL[r.status]}
        </span>
      </div>

      {active ? (
        <>
          <ProgressBar percent={r.percent} status={r.status} />
          <div className="num flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
            <span className="text-muted">
              {r.goal_words ? `${Math.max(0, r.words_added).toLocaleString()} / ${r.goal_words.toLocaleString()} words` : ""}
              {r.goal_words && r.goal_sentences ? " · " : ""}
              {r.goal_sentences ? `${Math.max(0, r.sentences_added)} / ${r.goal_sentences} sentences` : ""}
            </span>
            <span className="font-display text-lg font-bold">{r.percent}%</span>
          </div>
          <p className="num text-xs text-muted">
            {r.status === "unlocked" && r.unlocked_at
              ? `Unlocked ${ago(r.unlocked_at, now)}`
              : paused
                ? `Last update ${ago(r.updated_at, now)}`
                : r.deadline
                  ? `Due ${clock(r.deadline)}`
                  : r.started_at
                    ? `Started ${ago(r.started_at, now)}`
                    : ""}
            {r.streak > 1 && <span className="ml-2 font-bold text-warn">{r.streak}-day streak</span>}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted">
          {r.last_unlocked_at ? `Last unlocked ${ago(r.last_unlocked_at, now)}` : "Hasn't unlocked yet"}
          {r.streak > 1 && <span className="ml-2 font-bold text-warn">{r.streak}-day streak</span>}
        </p>
      )}
    </article>
  );
}
