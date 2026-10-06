"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ago, clock, duration } from "@/lib/format";
import { STATUS_LABEL, status as statusOf } from "@/lib/progress";
import Connect from "./Connect";
import ProgressBar from "./ProgressBar";
import ProgressRing from "./ProgressRing";
import { ALMOST_PERCENT } from "./status";
import { FLAG_NOTE, type SessionView } from "./types";
import UnlockTakeover from "./UnlockTakeover";
import WordsChart from "./WordsChart";

const POLL_MS = 45_000;
const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const seenKey = (id: string) => `unlock-seen:${id}`;

function seen(id: string) {
  try {
    return localStorage.getItem(seenKey(id)) === "1";
  } catch {
    return false;
  }
}
function markSeen(id: string) {
  try {
    localStorage.setItem(seenKey(id), "1");
  } catch {}
}

function useNow(ms: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/** Words per minute over the last ~5 minutes of snapshots. */
function recentWpm(points: SessionView["snapshots"]) {
  if (points.length < 2) return null;
  const last = points[points.length - 1];
  const start = [...points].reverse().find((p) => Date.parse(last.t) - Date.parse(p.t) >= 5 * 60_000) ?? points[0];
  const mins = (Date.parse(last.t) - Date.parse(start.t)) / 60_000;
  return mins > 0 ? Math.max(0, Math.round((last.words - start.words) / mins)) : null;
}

export default function Dashboard({ accessToken }: { accessToken: string | null }) {
  const [session, setSession] = useState<SessionView | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [visible, setVisible] = useState(true);
  const [takeover, setTakeover] = useState(false);
  const [menu, setMenu] = useState(false);
  const now = useNow(1000);
  const sessionRef = useRef<SessionView | null>(null);

  const apply = useCallback((s: SessionView | null) => {
    const before = sessionRef.current;
    if (s?.unlockedAt && !before?.unlockedAt && typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
      new Notification("Unlocked!", { body: "Goal hit. Your friends have been pinged." });
    }
    if (s?.unlockedAt && !seen(s.id)) setTakeover(true);
    sessionRef.current = s;
    setSession(s);
  }, []);

  const poll = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/session/poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tz: tz() }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "Couldn't check your doc");
      setError(null);
      apply(data.session);
    } catch {
      setError("You're offline");
    } finally {
      setChecking(false);
    }
  }, [apply]);

  const load = useCallback(() => {
    fetch(`/api/session?tz=${encodeURIComponent(tz())}`)
      .then((r) => r.json())
      .then((d) => apply(d.session ?? null))
      .catch(() => setError("Couldn't load your session"));
  }, [apply]);

  useEffect(load, [load]);

  const active = !!session && !session.unlockedAt;
  useEffect(() => {
    if (!active) return;
    // Polls only while this tab is visible; the server ignores polls < 20s apart.
    const onVis = () => {
      setVisible(document.visibilityState === "visible");
      if (document.visibilityState === "visible") poll();
    };
    const id = setInterval(() => document.visibilityState === "visible" && poll(), POLL_MS);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [active, poll]);

  async function end() {
    setMenu(false);
    if (!confirm("End this session? Friends will see you as not writing.")) return;
    await fetch("/api/session", { method: "DELETE" });
    sessionRef.current = null;
    setSession(null);
  }

  if (session === undefined) return <p className="text-muted">Loading…</p>;
  if (!session) return <Connect accessToken={accessToken} embedded onStarted={load} />;

  const s = session;
  const unlocked = s.status === "unlocked";
  const tookMs = s.unlockedAt ? Date.parse(s.unlockedAt) - Date.parse(s.startedAt) : 0;
  const earlyMs = s.unlockedAt && s.deadline ? Date.parse(s.deadline) - Date.parse(s.unlockedAt) : null;
  const sinceCheck = Math.max(0, Math.round((now - Date.parse(s.lastPolledAt)) / 1000));
  const wpm = recentWpm(s.snapshots);
  const chartGoal = s.goalWords ?? s.goalSentences!;
  const chartPoints = s.snapshots.map((p) => ({ t: p.t, value: s.goalWords ? p.words : p.sentences }));

  let deadlineText: string | null = null;
  if (s.deadline) {
    const left = Date.parse(s.deadline) - now;
    if (unlocked && earlyMs !== null) {
      deadlineText = earlyMs >= 60_000 ? `Unlocked ${duration(earlyMs)} early` : earlyMs > -60_000 ? "Unlocked right on time" : `Unlocked ${duration(-earlyMs)} after the deadline`;
    } else {
      deadlineText = left > 0 ? `${duration(left)} left · due ${clock(s.deadline)}` : `Deadline passed ${clock(s.deadline)}`;
    }
  } else if (unlocked) {
    deadlineText = `Unlocked in ${duration(tookMs)}`;
  }

  const live = !error && visible && !unlocked;
  const pill = unlocked
    ? { dot: "bg-good", text: `Unlocked ${clock(s.unlockedAt!)}` }
    : error
      ? { dot: "bg-bad", text: error }
      : !visible
        ? { dot: "bg-warn", text: "Paused · friends see you as paused" }
        : { dot: "bg-good animate-pulse", text: `Live · checked ${checking ? "now" : `${sinceCheck}s ago`}` };

  return (
    <>
      {takeover && s.unlockedAt && (
        <UnlockTakeover
          tookMs={tookMs}
          earlyMs={earlyMs}
          streak={s.stats.streak}
          isBest={s.stats.isBest}
          onClose={() => {
            markSeen(s.id);
            setTakeover(false);
          }}
        />
      )}

      <div className="space-y-5">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{s.docTitle ?? "Your doc"}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-panel px-3 py-1 text-sm font-medium">
                <span className={`h-2 w-2 rounded-full ${pill.dot}`} />
                <span className="num">{pill.text}</span>
              </span>
              {live && (
                <button onClick={poll} disabled={checking} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-panel hover:text-text" aria-label="Check now" title="Check now">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className={checking ? "animate-spin" : ""} aria-hidden>
                    <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div className="relative shrink-0">
            <button onClick={() => setMenu((m) => !m)} className="grid h-10 w-10 place-items-center rounded-full border border-line text-muted hover:text-text" aria-label="Session menu" aria-expanded={menu}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>
            {menu && (
              <div className="absolute right-0 z-20 mt-2 w-48 rounded-2xl border border-line bg-panel p-2 shadow-xl">
                <Link href="/connect" className="block rounded-xl px-3 py-2 text-sm hover:bg-white/5">New session</Link>
                <button onClick={end} className="w-full rounded-xl px-3 py-2 text-left text-sm text-bad hover:bg-white/5">End session</button>
              </div>
            )}
          </div>
        </header>

        <div className="grid items-start gap-5 md:grid-cols-[minmax(260px,320px)_1fr]">
          <section className="card flex flex-col items-center gap-4 text-center">
            <ProgressRing percent={s.percent} status={s.status} label={STATUS_LABEL[s.status]} />
            {s.goalWords && s.goalSentences && (
              <p className="num text-sm text-muted">
                Words {s.wordsPercent}% · Sentences {s.sentencesPercent}%
                <br />
                <span className="text-xs">The ring follows the one you&apos;re behind on.</span>
              </p>
            )}
            {deadlineText && <p className={`num font-semibold ${unlocked ? "text-good" : ""}`}>{deadlineText}</p>}
            {unlocked && (
              <Link href="/lobby" className="btn w-full">
                Go to lobby
              </Link>
            )}
          </section>

          <section className="card space-y-5">
            {s.goalWords && <Goal label="Words" value={s.wordsAdded} goal={s.goalWords} />}
            {s.goalSentences && <Goal label="Sentences" value={s.sentencesAdded} goal={s.goalSentences} />}
            <dl className="grid grid-cols-3 gap-3 border-t border-line pt-4 text-center">
              <Stat label="Words/min" value={wpm ?? "–"} />
              <Stat label="Day streak" value={s.stats.streak || "–"} />
              <Stat label="Best unlock" value={s.stats.bestMs ? duration(s.stats.bestMs) : "–"} />
            </dl>
            {(s.pastedWords > 0 || s.flags.length > 0) && (
              <div className="space-y-1.5 rounded-2xl bg-warn/10 px-4 py-3 text-sm text-warn">
                {s.pastedWords > 0 && (
                  <p className="num">
                    Pasted {s.pastedWords.toLocaleString()} words, not counted. Only words you type count. Friends don&apos;t see this.
                  </p>
                )}
                {s.flags.map((f) => (
                  <p key={f}>{FLAG_NOTE[f]}</p>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="card">
          <h2 className="mb-3 font-display text-lg font-bold">{s.goalWords ? "Words" : "Sentences"} added</h2>
          <WordsChart points={chartPoints} goal={chartGoal} startedAt={s.startedAt} deadline={s.deadline} unit={s.goalWords ? "words" : "sentences"} />
          {!unlocked && (
            <p className="mt-3 text-sm text-muted">
              Keep this tab open while you write. If you close it, friends see you as paused. Bars turn amber at {ALMOST_PERCENT}%.
            </p>
          )}
        </section>
        <p className="text-center text-xs text-muted">Started {ago(s.startedAt, now)}</p>
      </div>
    </>
  );
}

function Goal({ label, value, goal }: { label: string; value: number; goal: number }) {
  const v = Math.max(0, value);
  const status = statusOf(v / goal, false);
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-medium text-muted">{label}</span>
        <span className="num">
          <b className="font-display text-2xl">{v.toLocaleString()}</b> <span className="text-muted">/ {goal.toLocaleString()}</span>
        </span>
      </div>
      <ProgressBar percent={Math.floor((v / goal) * 100)} status={status} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dd className="num font-display text-xl font-bold">{value}</dd>
      <dt className="text-xs text-muted">{label}</dt>
    </div>
  );
}
