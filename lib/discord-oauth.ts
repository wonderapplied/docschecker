import "server-only";

// "Connect Discord": OAuth with the `identify` scope, used only to learn the user's Discord ID
// so unlock pings can @mention them. Not a sign-in method.
export const DISCORD_STATE_COOKIE = "discord_oauth_state";

export function discordConfig() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!clientId || !clientSecret || !site) return null;
  return { clientId, clientSecret, redirectUri: `${site}/api/discord/callback` };
}
