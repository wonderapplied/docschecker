import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { DISCORD_STATE_COOKIE, discordConfig } from "@/lib/discord-oauth";
import { db } from "@/lib/supabase";

export async function GET(req: Request) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const back = (result: string) => {
    const res = NextResponse.redirect(`${site}/friends?discord=${result}`);
    res.cookies.delete(DISCORD_STATE_COOKIE);
    return res;
  };

  const u = await requireUser();
  if ("error" in u) return u.error;
  const cfg = discordConfig();
  if (!cfg) return back("error");

  const params = new URL(req.url).searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const cookieState = req.headers
    .get("cookie")
    ?.split(/;\s*/)
    .find((c) => c.startsWith(`${DISCORD_STATE_COOKIE}=`))
    ?.split("=")[1];
  if (!code || !state || state !== cookieState) return back("error");

  try {
    // The token endpoint only accepts form encoding.
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: cfg.redirectUri,
      }),
    });
    if (!tokenRes.ok) return back("error");
    const { access_token } = await tokenRes.json();

    const meRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!meRes.ok) return back("error");
    const me: { id: string; username: string; global_name?: string | null } = await meRes.json();

    const { error } = await db()
      .from("users")
      .update({ discord_id: me.id, discord_username: me.global_name || me.username })
      .eq("id", u.userId);
    if (error) throw error;
    return back("connected");
  } catch (err) {
    console.error("Discord connect failed", err);
    return back("error");
  }
}
