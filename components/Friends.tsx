"use client";

import { useEffect, useState } from "react";

type Data = { inviteCode: string; discordId: string | null; friends: { id: string; name: string; avatar: string | null }[] };

export default function Friends({ siteUrl }: { siteUrl: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [copied, setCopied] = useState(false);
  const [discordId, setDiscordId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = () =>
    fetch("/api/friends")
      .then((r) => r.json())
      .then((d: Data) => {
        setData(d);
        setDiscordId(d.discordId ?? "");
      });
  useEffect(() => {
    load();
  }, []);

  if (!data) return <p className="text-muted">Loading…</p>;
  const link = `${siteUrl}/invite/${data.inviteCode}`;

  async function remove(id: string) {
    if (!confirm("Remove this friend?")) return;
    await fetch(`/api/friends?id=${id}`, { method: "DELETE" });
    load();
  }

  async function saveDiscord(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discordId }),
    });
    const json = await res.json();
    setMsg(res.ok ? "Saved" : json.error);
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Friends</h1>

      <div className="card space-y-3">
        <h2 className="font-semibold">Your invite link</h2>
        <p className="text-sm text-muted">Anyone who opens it and signs in becomes your friend in the lobby.</p>
        <div className="flex gap-2">
          <input className="input font-mono text-sm" readOnly value={link} onFocus={(e) => e.target.select()} />
          <button
            className="btn shrink-0"
            onClick={() => {
              navigator.clipboard.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">Friends ({data.friends.length})</h2>
        {data.friends.length === 0 && <p className="text-sm text-muted">None yet. Send your link to the group chat.</p>}
        <ul className="divide-y divide-line">
          {data.friends.map((f) => (
            <li key={f.id} className="flex items-center gap-3 py-2">
              {f.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.avatar} alt="" className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <div className="grid h-8 w-8 place-items-center rounded-full bg-line">{f.name[0]}</div>
              )}
              <span className="flex-1">{f.name}</span>
              <button className="text-sm text-muted hover:text-red-400" onClick={() => remove(f.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>

      <form className="card space-y-3" onSubmit={saveDiscord}>
        <h2 className="font-semibold">Discord</h2>
        <p className="text-sm text-muted">
          Add your Discord user ID so the unlock ping @mentions you. In Discord: Settings → Advanced → Developer Mode,
          then right-click your name → Copy User ID.
        </p>
        <div className="flex gap-2">
          <input className="input" value={discordId} onChange={(e) => setDiscordId(e.target.value)} placeholder="e.g. 123456789012345678" />
          <button className="btn shrink-0">Save</button>
        </div>
        {msg && <p className="text-sm text-muted">{msg}</p>}
      </form>
    </div>
  );
}
