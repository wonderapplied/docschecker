import "server-only";

export async function sendUnlockPing(name: string, discordId: string | null) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  const who = discordId ? `<@${discordId}>` : `**${name}**`;
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const content = `🔓 ${who} is free, hop on.${site ? ` ${site}/lobby` : ""}`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        allowed_mentions: { users: discordId ? [discordId] : [] },
      }),
    });
  } catch (err) {
    console.error("Discord ping failed", err);
  }
}
