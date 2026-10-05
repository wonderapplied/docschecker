"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import ProgressBar from "./ProgressBar";
import ProgressRing from "./ProgressRing";
import Sparkline from "./Sparkline";
import { FLAG_LABEL, type SessionView } from "./types";
import { STATUS_LABEL } from "@/lib/progress";

const POLL_MS = 45_000;

function timeLeft(deadline: string) {
  const ms = Date.parse(deadline) - Date.now();
  if (ms <= 0) return "past deadline";
  const m = Math.round(ms / 60_000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m left` : `${m}m left`;
}

export default function Dashboard() {
  const [session, setSession] = useState<SessionView | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const wasUnlocked = useRef(false);

  const apply = useCallback((s: SessionView | null) => {
    if (s?.unlockedAt && !wasUnlocked.current) {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("🔓 Unlocked!", { body: "Goal hit. Your friends have been pinged." });
      }
    }
    wasUnlocked.current = !!s?.unlockedAt;
    setSession(s);
  }, []);

  const poll = useCallback(async () => {
    const res = await fetch("/api/session/poll", { method: "POST" });
    const data = await res.json();
    if (!res.ok) return setError(data.error ?? "Poll failed");
    setError(null);
    apply(data.session);
  }, [apply]);

  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((d) => {
        wasUnlocked.current = !!d.session?.unlockedAt;
        setSession(d.session ?? null);
      })
      .catch(() => setError("Couldn't load your session"));
  }, []);

  const active = !!session && !session.unlockedAt;
  useEffect(() => {
    if (!active) return;
    // Polling runs while this page is open; the server ignores polls < 20s apart.
    const tick = () => document.visibilityState === "visible" && poll();
    const id = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [active, poll]);

  async function end() {
    if (!confirm("End this session?")) return;
    setBusy(true);
    await fetch("/api/session", { method: "DELETE" });
    setBusy(false);
    setSession(null);
  }

  if (session === undefined) return <p className="text-muted">Loading…</p>;

  if (!session) {
    return (
      <div className="card mx-auto max-w-lg py-12 text-center">
        <ProgressRing percent={0} size={160} />
        <h1 className="mt-6 text-2xl font-bold">No session running</h1>
        <p className="mt-2 text-muted">Pick a doc and a goal to start counting.</p>
        <Link href="/connect" className="btn mt-6">
          Start session
        </Link>
      </div>
    );
  }

  const unlocked = session.status === "unlocked";
  return (
    <div className="grid gap-6 md:grid-cols-[auto_1fr]">
      <div className="card flex flex-col items-center gap-4">
        <ProgressRing percent={session.percent} label={STATUS_LABEL[session.status]} />
        {unlocked ? (
          <p className="text-center text-lg font-semibold text-good">You&apos;re free. Go play.</p>
        ) : (
          <button className="btn-ghost w-full" onClick={() => poll()}>
            Check now
          </button>
        )}
        <div className="flex w-full gap-2">
          <Link href="/connect" className="btn-ghost flex-1 text-sm">
            New session
          </Link>
          <button className="btn-ghost flex-1 text-sm" onClick={end} disabled={busy}>
            End
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="card space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="text-xl font-bold">{session.docTitle ?? "Your doc"}</h1>
            <span className="text-sm text-muted">
              {session.deadline ? timeLeft(session.deadline) : "No deadline"}
              {session.unlockedAt ? ` · unlocked ${new Date(session.unlockedAt).toLocaleTimeString()}` : ""}
            </span>
          </div>
          {session.goalWords && (
            <Goal label="Words" value={session.wordsAdded} goal={session.goalWords} />
          )}
          {session.goalSentences && (
            <Goal label="Sentences" value={session.sentencesAdded} goal={session.goalSentences} />
          )}
          {session.flags.length > 0 && (
            <p className="rounded-xl bg-warn/10 px-3 py-2 text-sm text-warn">
              Friends see: {session.flags.map((f) => FLAG_LABEL[f]).join(", ")}
              {session.discountedWords > 0 && ` · ${session.discountedWords} pasted words not counted`}
            </p>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <p className="text-xs text-muted">
            Last checked {new Date(session.lastPolledAt).toLocaleTimeString()}. Keep this tab open while you write;
            it checks your doc about every 45 seconds.
          </p>
        </div>
        <div className="card">
          <Sparkline points={session.snapshots} goal={session.goalWords} />
        </div>
      </div>
    </div>
  );
}

function Goal({ label, value, goal }: { label: string; value: number; goal: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span>
          <b>{Math.max(0, value).toLocaleString()}</b> / {goal.toLocaleString()}
        </span>
      </div>
      <ProgressBar percent={Math.floor((Math.max(0, value) / goal) * 100)} />
    </div>
  );
}
