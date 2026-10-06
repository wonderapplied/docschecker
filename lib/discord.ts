import "server-only";
import { duration } from "./format";

/** Only real Discord webhook URLs, so a saved URL can't point the server anywhere else. */
export function isDiscordWebhook(raw: string): boolean {
  try {
    const u = new URL(raw);
    return (
      u.protocol === "https:" &&
      ["discord.com", "discordapp.com", "canary.discord.com", "ptb.discord.com"].includes(u.hostname) &&
      /^\/api\/(v\d+\/)?webhooks\/\d+\/[\w-]+$/.test(u.pathname)
    );
  } catch {
    return false;
  }
}

type Sender = { name: string | null; discord_id: string | null; discord_webhook_url: string | null };

async function post(webhook: string | null, content: string, mention: string[]) {
  const url = webhook ?? process.env.DISCORD_WEBHOOK_URL;
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, allowed_mentions: { users: mention } }),
    });
    return res.ok;
  } catch (err) {
    console.error("Discord post failed", err);
    return false;
  }
}

const who = (u: { name: string | null; discord_id: string | null }) =>
  u.discord_id ? `<@${u.discord_id}>` : `**${u.name ?? "Someone"}**`;

const lobbyLink = () => (process.env.NEXT_PUBLIC_SITE_URL ? ` ${process.env.NEXT_PUBLIC_SITE_URL}/lobby` : "");

/** Posts to the writer's own ping channel, falling back to the site-wide webhook. */
export async function sendUnlockPing(user: Sender, tookMs: number) {
  const mention = user.discord_id ? [user.discord_id] : [];
  return post(user.discord_webhook_url, `🔓 ${who(user)} unlocked in ${duration(tookMs)} and is free. Hop on.${lobbyLink()}`, mention);
}

/** "Ping Jordan" from the lobby: goes to the sender's channel and @mentions the friend. */
export async function sendFriendPing(from: Sender, to: { name: string | null; discord_id: string | null }) {
  const mention = to.discord_id ? [to.discord_id] : [];
  return post(from.discord_webhook_url, `🎮 ${who(to)}, ${from.name ?? "a friend"} wants to play. You in?${lobbyLink()}`, mention);
}
