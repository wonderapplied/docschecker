"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { duration } from "@/lib/format";
import Logo from "./Logo";

const COLORS = ["var(--brand)", "var(--good)", "var(--warn)", "#7cc7ff", "#ffffff"];

/** Full-screen celebration the first time you see a session unlocked. */
export default function UnlockTakeover({
  tookMs,
  earlyMs,
  streak,
  isBest,
  onClose,
}: {
  tookMs: number;
  earlyMs: number | null;
  streak: number;
  isBest: boolean;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 350);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const pieces = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        dur: 2.4 + Math.random() * 1.8,
        drift: `${(Math.random() - 0.5) * 30}vw`,
        spin: `${(Math.random() - 0.5) * 1440}deg`,
        color: COLORS[i % COLORS.length],
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 10,
      })),
    [],
  );

  return (
    <div role="dialog" aria-modal="true" aria-label="Unlocked" className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-bg/95 px-6 backdrop-blur">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {pieces.map((p, i) => (
          <span
            key={i}
            className="absolute top-0 rounded-[2px]"
            style={
              {
                left: `${p.left}%`,
                width: p.w,
                height: p.h,
                background: p.color,
                animation: `confetti-fall ${p.dur}s ${p.delay}s cubic-bezier(0.25, 0.6, 0.4, 1) both`,
                "--drift": p.drift,
                "--spin": p.spin,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="relative flex max-w-md flex-col items-center text-center">
        <div className="animate-pop-in grid h-40 w-40 place-items-center rounded-full bg-good/15 ring-8 ring-good/10">
          <Logo size={96} open={open} className="text-good" />
        </div>
        <h1 className="animate-slide-up mt-8 font-display text-5xl font-extrabold tracking-tight sm:text-6xl" style={{ animationDelay: "200ms" }}>
          Unlocked
        </h1>
        <p className="animate-slide-up num mt-3 text-xl text-muted" style={{ animationDelay: "300ms" }}>
          in <span className="font-bold text-text">{duration(tookMs)}</span>
          {earlyMs !== null && earlyMs > 60_000 && (
            <>
              {" "}· <span className="font-bold text-good">{duration(earlyMs)} early</span>
            </>
          )}
        </p>
        {(streak > 1 || isBest) && (
          <div className="animate-slide-up mt-5 flex flex-wrap justify-center gap-2" style={{ animationDelay: "400ms" }}>
            {streak > 1 && <span className="rounded-full bg-warn/15 px-3 py-1 text-sm font-bold text-warn">{streak}-day unlock streak</span>}
            {isBest && <span className="rounded-full bg-brand/15 px-3 py-1 text-sm font-bold text-brand">New personal best</span>}
          </div>
        )}
        <p className="animate-slide-up mt-6 text-muted" style={{ animationDelay: "450ms" }}>
          Your friends just got pinged. You&apos;re free. Go play.
        </p>
        <Link href="/lobby" className="btn animate-slide-up mt-8 w-full py-4 text-lg" style={{ animationDelay: "500ms" }}>
          Go to lobby
        </Link>
        <button onClick={onClose} className="mt-4 text-sm font-medium text-muted hover:text-text">
          Stay here
        </button>
      </div>
    </div>
  );
}
