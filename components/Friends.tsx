"use client";

import { useEffect, useState, useTransition } from "react";
import { deleteAccount } from "@/app/actions/account";
import Avatar from "./Avatar";

type Data = {
  inviteCode: string;
  discord: { id: string; username: string | null } | null;
  discordConfigured: boolean;
  webhookUrl: string | null;
  friends: { id: string; name: string; avatar: string | null }[];
};

export default function Friends({ siteUrl, discordResult }: { siteUrl: string; discordResult: string | null }) {
  const [data, setData] = useState<Data | null>(null);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [webhook, setWebhook] = useState("");
  const [deleting, startDelete] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(
    discordResult === "connected"
      ? { ok: true, text: "Discord connected." }
      : discordResult === "error"
        ? { ok: false, text: "Couldn't connect Discord. Try again." }
        : null,
  );

  const load = () =>
    fetch("/api/friends")
      .then((r) => r.json())
      .then((d: Data) => {
        setData(d);
        setWebhook(d.webhookUrl ?? "");
      });
  useEffect(() => {
    load();
    setCanShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  if (!data) return <p className="text-muted">Loading…</p>;
  const link = `${siteUrl}/invite/${data.inviteCode}`;

  async function remove(id: string, name: string) {
    if (!confirm(`Remove ${name}? You'll stop seeing each other in the lobby.`)) return;
    await fetch(`/api/friends?id=${id}`, { method: "DELETE" });
    load();
  }

  async function resetLink() {
    if (!confirm("Make a new invite link? The old one stops working. Current friends stay.")) return;
    const res = await fetch("/api/friends/invite", { method: "POST" });
    if (res.ok) {
      const { inviteCode } = await res.json();
      setData((d) => (d ? { ...d, inviteCode } : d));
    }
  }

  async function share() {
    try {
      await navigator.share({ title: "Join my Unlocked lobby", text: "Join my lobby on Unlocked so we know when we're free to play.", url: link });
    } catch {}
  }

  function removeAccount() {
    if (!confirm("Delete your Unlocked account? Your progress history, friends and settings are erased. This can't be undone.")) return;
    startDelete(() => deleteAccount());
  }

  async function disconnect() {
    await fetch("/api/discord/connect", { method: "DELETE" });
    load();
  }

  async function saveWebhook(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discordWebhookUrl: webhook }),
    });
    const json = await res.json();
    setMsg(res.ok ? { ok: true, text: webhook ? "Ping channel saved." : "Ping channel removed." } : { ok: false, text: json.error });
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Friends</h1>
      {msg && (
        <p role="status" className={`rounded-2xl px-4 py-3 text-sm ${msg.ok ? "bg-good/10 text-good" : "bg-bad/10 text-bad"}`}>
          {msg.text}
        </p>
      )}

      <section className="card space-y-3">
        <h2 className="font-display text-lg font-bold">Invite to your lobby</h2>
        <p className="text-sm text-muted">Anyone who opens this link and signs in joins your lobby. Reset it if it gets passed around.</p>
        <div className="flex gap-2">
          <input className="input num min-w-0 text-sm" readOnly value={link} aria-label="Invite link" onFocus={(e) => e.target.select()} />
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
          {canShare && (
            <button className="btn-ghost shrink-0" onClick={share}>
              Share
            </button>
          )}
        </div>
        <button onClick={resetLink} className="text-sm font-semibold text-muted hover:text-text">
          Reset link
        </button>
      </section>

      <section className="card space-y-2">
        <h2 className="font-display text-lg font-bold">
          Friends <span className="num text-muted">({data.friends.length})</span>
        </h2>
        {data.friends.length === 0 && <p className="text-sm text-muted">None yet. Send your link to the group chat.</p>}
        <ul className="divide-y divide-line">
          {data.friends.map((f) => (
            <li key={f.id} className="flex items-center gap-3 py-3">
              <Avatar src={f.avatar} name={f.name} size={36} />
              <span className="flex-1 font-medium">{f.name}</span>
              <button className="rounded-xl px-2 py-1 text-sm text-muted hover:bg-bad/10 hover:text-bad" onClick={() => remove(f.id, f.name)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-5">
        <div>
          <h2 className="font-display text-lg font-bold">Discord</h2>
          <p className="mt-1 text-sm text-muted">When you unlock, Unlocked posts in your group&apos;s channel and @mentions you.</p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-panel-2 px-4 py-3">
          <svg width="28" height="22" viewBox="0 0 28 22" aria-hidden>
            <path
              fill="#5865F2"
              d="M23.7 1.8A23 23 0 0 0 18 0l-.7 1.5a21 21 0 0 0-6.6 0L10 0a23 23 0 0 0-5.7 1.8C.6 7.2-.4 12.5.1 17.7A23 23 0 0 0 7.1 21l1.4-2.3a15 15 0 0 1-2.3-1.1l.6-.4a16.4 16.4 0 0 0 14.4 0l.6.4c-.7.4-1.5.8-2.3 1.1L20.9 21a23 23 0 0 0 7-3.3c.6-6-1-11.3-4.2-15.9ZM9.4 14.5c-1.4 0-2.5-1.3-2.5-2.8S8 8.9 9.4 8.9s2.5 1.3 2.5 2.8-1.1 2.8-2.5 2.8Zm9.2 0c-1.4 0-2.5-1.3-2.5-2.8s1.1-2.8 2.5-2.8 2.5 1.3 2.5 2.8-1.1 2.8-2.5 2.8Z"
            />
          </svg>
          <div className="min-w-0 flex-1">
            {data.discord ? (
              <>
                <p className="font-semibold">Connected as {data.discord.username ?? "you"}</p>
                <p className="text-sm text-muted">Unlock pings @mention you.</p>
              </>
            ) : (
              <>
                <p className="font-semibold">Not connected</p>
                <p className="text-sm text-muted">Pings use your name instead of an @mention.</p>
              </>
            )}
          </div>
          {data.discord ? (
            <button onClick={disconnect} className="text-sm font-semibold text-muted hover:text-text">
              Disconnect
            </button>
          ) : data.discordConfigured ? (
            <a href="/api/discord/connect" className="shrink-0 rounded-2xl bg-[#5865F2] px-4 py-2 font-display font-bold text-white hover:brightness-110">
              Connect
            </a>
          ) : (
            <span className="text-xs text-muted">Not set up on this site</span>
          )}
        </div>

        <form onSubmit={saveWebhook} className="space-y-2">
          <label htmlFor="webhook" className="label">
            Ping channel
          </label>
          <div className="flex gap-2">
            <input
              id="webhook"
              className="input min-w-0 text-sm"
              value={webhook}
              onChange={(e) => setWebhook(e.target.value)}
              placeholder="https://discord.com/api/webhooks/…"
            />
            <button className="btn-ghost shrink-0">Save</button>
          </div>
          <p className="text-xs text-muted">
            In Discord: channel settings → Integrations → Webhooks → New Webhook → Copy Webhook URL. One person in the group can make it and
            share it.
          </p>
        </form>
      </section>

      <section className="card space-y-3">
        <h2 className="font-display text-lg font-bold">Account</h2>
        <p className="text-sm text-muted">
          Deleting your account erases your sessions, progress history, friends and Discord settings, and removes Unlocked&apos;s access
          to your Google account.
        </p>
        <button onClick={removeAccount} disabled={deleting} className="rounded-2xl border border-bad/40 px-4 py-2 text-sm font-semibold text-bad hover:bg-bad/10 disabled:opacity-50">
          {deleting ? "Deleting…" : "Delete account"}
        </button>
      </section>
    </div>
  );
}
