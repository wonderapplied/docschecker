"use client";

import { useRouter } from "next/navigation";
import Script from "next/script";
import { useMemo, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    gapi?: any;
    google?: any;
  }
}

type Picked = { id: string; name: string };
type Counts = { title: string | null; words: number; sentences: number };

const WORD_PRESETS = [500, 1000, 1500];

function deadlinePresets(now = new Date()) {
  const presets: { label: string; at: Date }[] = [
    { label: "1 hour", at: new Date(now.getTime() + 60 * 60_000) },
    { label: "2 hours", at: new Date(now.getTime() + 120 * 60_000) },
  ];
  const tonight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 0);
  if (tonight.getTime() - now.getTime() > 150 * 60_000) presets.push({ label: "Tonight 11 PM", at: tonight });
  return presets;
}

const toLocalInput = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

function DocsIcon() {
  return (
    <svg width="18" height="22" viewBox="0 0 18 22" aria-hidden>
      <path d="M2 0h10l6 6v14a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2Z" fill="#4285F4" />
      <path d="M12 0l6 6h-4a2 2 0 0 1-2-2V0Z" fill="#A1C2FA" />
      <path d="M4.5 10h9M4.5 13h9M4.5 16h6" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export default function Connect({
  accessToken,
  embedded = false,
  onStarted,
}: {
  accessToken: string | null;
  embedded?: boolean;
  onStarted?: () => void;
}) {
  const router = useRouter();
  const [pickerReady, setPickerReady] = useState(false);
  const [doc, setDoc] = useState<Picked | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [goalWords, setGoalWords] = useState("1000");
  const [goalSentences, setGoalSentences] = useState("");
  const [showSentences, setShowSentences] = useState(false);
  const [deadlineChoice, setDeadlineChoice] = useState<string>("none");
  const [customDeadline, setCustomDeadline] = useState("");
  const [showTitle, setShowTitle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const presets = useMemo(() => deadlinePresets(), []);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const appId = process.env.NEXT_PUBLIC_GOOGLE_APP_ID;

  function onGapiLoad() {
    window.gapi.load("picker", () => setPickerReady(true));
  }

  function openPicker() {
    if (!accessToken) return setError("Your Google sign-in expired. Sign out and back in.");
    if (!apiKey || !appId) return setError("NEXT_PUBLIC_GOOGLE_API_KEY / NEXT_PUBLIC_GOOGLE_APP_ID aren't set.");
    const g = window.google.picker;
    const view = new g.DocsView(g.ViewId.DOCUMENTS)
      .setMimeTypes("application/vnd.google-apps.document")
      .setIncludeFolders(true)
      .setSelectFolderEnabled(false);
    new g.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(apiKey)
      // The app ID is what grants drive.file access to the picked doc.
      .setAppId(appId)
      .setTitle("Pick the doc you're writing in")
      .setCallback(async (data: any) => {
        if (data[g.Response.ACTION] !== g.Action.PICKED) return;
        const d = data[g.Response.DOCUMENTS][0];
        const picked = { id: d[g.Document.ID], name: d[g.Document.NAME] };
        setDoc(picked);
        setCounts(null);
        setError(null);
        const res = await fetch(`/api/doc/${picked.id}`);
        const json = await res.json();
        if (res.ok) setCounts(json);
        else setError(json.error);
      })
      .build()
      .setVisible(true);
  }

  const deadline =
    deadlineChoice === "custom"
      ? customDeadline
        ? new Date(customDeadline).toISOString()
        : null
      : (presets.find((p) => p.label === deadlineChoice)?.at.toISOString() ?? null);

  const hasGoal = !!goalWords || (showSentences && !!goalSentences);
  const blocker = !doc ? "Pick a doc first" : !hasGoal ? "Set a word or sentence goal" : null;

  async function start(e: React.FormEvent) {
    e.preventDefault();
    if (blocker || !doc) return;
    setBusy(true);
    setError(null);
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        docId: doc.id,
        docTitle: doc.name,
        showTitle,
        goalWords: goalWords || null,
        goalSentences: showSentences ? goalSentences || null : null,
        deadline,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setError(json.error);
    if (onStarted) onStarted();
    else router.push("/dashboard");
  }

  return (
    <form className="mx-auto max-w-xl space-y-5" onSubmit={start}>
      <Script src="https://apis.google.com/js/api.js" onLoad={onGapiLoad} />
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          {embedded ? "What are you writing tonight?" : "New session"}
        </h1>
        <p className="mt-2 text-muted">Pick a doc, set a goal, and start writing. Friends see your bar fill up.</p>
      </div>

      <section className="card space-y-3">
        <h2 className="label">Doc</h2>
        {doc ? (
          <div className="flex items-center gap-3 rounded-2xl bg-panel-2 px-4 py-3">
            <DocsIcon />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{doc.name}</p>
              <p className="num text-sm text-muted">
                {counts
                  ? `${counts.words.toLocaleString()} words already there. Only what you add counts.`
                  : "Reading the doc…"}
              </p>
            </div>
            <button type="button" onClick={openPicker} className="text-sm font-semibold text-brand hover:underline">
              Change
            </button>
          </div>
        ) : (
          <>
            <button type="button" className="btn w-full" onClick={openPicker} disabled={!pickerReady}>
              {pickerReady ? "Choose a Google Doc" : "Loading Google Drive…"}
            </button>
            <p className="text-sm text-muted">Unlocked can only open the doc you pick here, nothing else in your Drive.</p>
          </>
        )}
      </section>

      <section className="card space-y-4">
        <h2 className="label">Goal: words to add</h2>
        <div className="flex flex-wrap gap-2">
          {WORD_PRESETS.map((n) => (
            <button key={n} type="button" className="chip num" aria-pressed={goalWords === String(n)} onClick={() => setGoalWords(String(n))}>
              {n.toLocaleString()}
            </button>
          ))}
          <input
            className="input num w-28 py-1.5"
            type="number"
            min={1}
            inputMode="numeric"
            aria-label="Custom word goal"
            placeholder="Custom"
            value={WORD_PRESETS.map(String).includes(goalWords) ? "" : goalWords}
            onChange={(e) => setGoalWords(e.target.value)}
          />
          {goalWords && (
            <button type="button" className="chip text-muted" onClick={() => setGoalWords("")}>
              No word goal
            </button>
          )}
        </div>
        {showSentences ? (
          <label className="block">
            <span className="label">Sentences to add (with both goals, you need both)</span>
            <input className="input num mt-1.5" type="number" min={1} inputMode="numeric" value={goalSentences} onChange={(e) => setGoalSentences(e.target.value)} placeholder="e.g. 60" />
          </label>
        ) : (
          <button type="button" className="text-sm font-semibold text-brand hover:underline" onClick={() => setShowSentences(true)}>
            + Add a sentence goal
          </button>
        )}
      </section>

      <section className="card space-y-4">
        <h2 className="label">Deadline</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="chip" aria-pressed={deadlineChoice === "none"} onClick={() => setDeadlineChoice("none")}>
            None
          </button>
          {presets.map((p) => (
            <button key={p.label} type="button" className="chip" aria-pressed={deadlineChoice === p.label} onClick={() => setDeadlineChoice(p.label)}>
              {p.label}
            </button>
          ))}
          <button
            type="button"
            className="chip"
            aria-pressed={deadlineChoice === "custom"}
            onClick={() => {
              setDeadlineChoice("custom");
              if (!customDeadline) setCustomDeadline(toLocalInput(new Date(Date.now() + 90 * 60_000)));
            }}
          >
            Custom
          </button>
        </div>
        {deadlineChoice === "custom" && (
          <input className="input" type="datetime-local" aria-label="Custom deadline" value={customDeadline} onChange={(e) => setCustomDeadline(e.target.value)} />
        )}
        <label className="flex items-center gap-2.5 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-[var(--brand)]" checked={showTitle} onChange={(e) => setShowTitle(e.target.checked)} />
          Show the doc title to friends
        </label>
      </section>

      {error && <p className="rounded-2xl bg-bad/10 px-4 py-3 text-sm text-bad">{error}</p>}
      <div>
        <button className="btn w-full py-4 text-lg" disabled={!!blocker || busy}>
          {busy ? "Starting…" : "Start session"}
        </button>
        {blocker && <p className="mt-2 text-center text-sm text-muted">{blocker}</p>}
      </div>
    </form>
  );
}
