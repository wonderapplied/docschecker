import { NextResponse } from "next/server";
import { errorResponse, requireUser } from "@/lib/api";
import { db } from "@/lib/supabase";

export async function PATCH(req: Request) {
  const u = await requireUser();
  if ("error" in u) return u.error;
  const body = await req.json().catch(() => ({}));
  const raw = typeof body.discordId === "string" ? body.discordId.trim() : "";
  // Discord user IDs are 17–20 digit snowflakes.
  if (raw && !/^\d{17,20}$/.test(raw)) {
    return NextResponse.json({ error: "Discord ID should be the long number from Copy User ID" }, { status: 400 });
  }
  try {
    const { error } = await db().from("users").update({ discord_id: raw || null }).eq("id", u.userId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
