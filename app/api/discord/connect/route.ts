import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { DISCORD_STATE_COOKIE, discordConfig } from "@/lib/discord-oauth";
import { db } from "@/lib/supabase";

export async function GET() {
  const u = await requireUser();
  if ("error" in u) return u.error;
  const cfg = discordConfig();
  if (!cfg) return NextResponse.json({ error: "Discord isn't set up on this site" }, { status: 500 });

  const state = crypto.randomUUID();
  const url = new URL("https://discord.com/oauth2/authorize");
  url.search = new URLSearchParams({
    client_id: cfg.clientId,
    response_type: "code",
    redirect_uri: cfg.redirectUri,
    scope: "identify",
    state,
    prompt: "none",
  }).toString();
  const res = NextResponse.redirect(url);
  res.cookies.set(DISCORD_STATE_COOKIE, state, { httpOnly: true, sameSite: "lax", secure: true, maxAge: 600, path: "/" });
  return res;
}

export async function DELETE() {
  const u = await requireUser();
  if ("error" in u) return u.error;
  const { error } = await db().from("users").update({ discord_id: null, discord_username: null }).eq("id", u.userId);
  if (error) return NextResponse.json({ error: "Couldn't disconnect" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
