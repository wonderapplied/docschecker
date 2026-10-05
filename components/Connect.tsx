"use client";

import { useRouter } from "next/navigation";
import Script from "next/script";
import { useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    gapi?: any;
    google?: any;
  }
}

type Picked = { id: string; name: string };
type Counts = { title: string | null; words: number; sentences: number };

export default function Connect({ accessToken }: { accessToken: string | null }) {
  const router = useRouter();
  const [pickerReady, setPickerReady] = useState(false);
  const [doc, setDoc] = useState<Picked | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [goalWords, setGoalWords] = useState("1200");
  const [goalSentences, setGoalSentences] = useState("");
  const [deadline, setDeadline] = useState("");
  const [showTitle, setShowTitle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  async function start(e: React.FormEvent) {
    e.preventDefault();
    if (!doc) return;
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
        goalSentences: goalSentences || null,
        deadline: deadline ? new Date(deadline).toISOString() : null,
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setError(json.error);
    router.push("/dashboard");
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Script src="https://apis.google.com/js/api.js" onLoad={onGapiLoad} />
      <h1 className="text-2xl font-bold">Start a session</h1>

      <div className="card space-y-3">
        <h2 className="font-semibold">1. Pick a doc</h2>
        <p className="text-sm text-muted">Unlocked only gets access to the doc you choose here.</p>
        <button className="btn" onClick={openPicker} disabled={!pickerReady}>
          {pickerReady ? (doc ? "Pick a different doc" : "Choose from Google Drive") : "Loading picker…"}
        </button>
        {doc && (
          <p className="text-sm">
            <b>{doc.name}</b>
            {counts && (
              <span className="text-muted">
                {" "}
                · currently {counts.words.toLocaleString()} words, {counts.sentences.toLocaleString()} sentences.
                Only what you add from now counts.
              </span>
            )}
          </p>
        )}
      </div>

      <form className="card space-y-4" onSubmit={start}>
        <h2 className="font-semibold">2. Set the goal</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="text-muted">Words to add</span>
            <input className="input mt-1" type="number" min={1} value={goalWords} onChange={(e) => setGoalWords(e.target.value)} placeholder="e.g. 1200" />
          </label>
          <label className="text-sm">
            <span className="text-muted">Sentences to add</span>
            <input className="input mt-1" type="number" min={1} value={goalSentences} onChange={(e) => setGoalSentences(e.target.value)} placeholder="e.g. 60" />
          </label>
        </div>
        <p className="text-xs text-muted">Fill in one or both. With both, you need to hit both.</p>
        <label className="block text-sm">
          <span className="text-muted">Deadline (optional)</span>
          <input className="input mt-1" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showTitle} onChange={(e) => setShowTitle(e.target.checked)} />
          Show the doc title to friends
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className="btn w-full" disabled={!doc || busy || (!goalWords && !goalSentences)}>
          {busy ? "Starting…" : "Start session"}
        </button>
      </form>
    </div>
  );
}
