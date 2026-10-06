import { NextResponse } from "next/server";
import { errorResponse, requireUser } from "@/lib/api";
import { isDiscordWebhook } from "@/lib/discord";
import { db } from "@/lib/supabase";

// Your ping channel: the Discord webhook your unlocks and lobby pings post to.
export async function PATCH(req: Request) {
  const u = await requireUser();
  if ("error" in u) return u.error;
  const body = await req.json().catch(() => ({}));
  const raw = typeof body.discordWebhookUrl === "string" ? body.discordWebhookUrl.trim() : "";
  if (raw && !isDiscordWebhook(raw)) {
    return NextResponse.json(
      { error: "Paste a Discord webhook URL (Channel settings → Integrations → Webhooks → Copy URL)" },
      { status: 400 },
    );
  }
  try {
    const { error } = await db().from("users").update({ discord_webhook_url: raw || null }).eq("id", u.userId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
