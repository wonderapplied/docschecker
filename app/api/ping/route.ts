import { NextResponse } from "next/server";
import { errorResponse, requireUser } from "@/lib/api";
import { sendFriendPing } from "@/lib/discord";
import { getUser } from "@/lib/sessions";
import { db } from "@/lib/supabase";

const COOLDOWN_MS = 2 * 60_000;

// "Ping Jordan" in the lobby: one Discord message, at most every 2 minutes per friend.
export async function POST(req: Request) {
  const u = await requireUser();
  if ("error" in u) return u.error;
  const { friendId } = await req.json().catch(() => ({}));
  if (typeof friendId !== "string" || !/^[0-9a-f-]{36}$/i.test(friendId)) {
    return NextResponse.json({ error: "Bad friend" }, { status: 400 });
  }
  try {
    const { data: f, error } = await db()
      .from("friendships")
      .select("last_pinged_at")
      .eq("user_id", u.userId)
      .eq("friend_id", friendId)
      .eq("status", "accepted")
      .maybeSingle();
    if (error) throw error;
    if (!f) return NextResponse.json({ error: "Not your friend" }, { status: 403 });
    if (f.last_pinged_at && Date.now() - Date.parse(f.last_pinged_at) < COOLDOWN_MS) {
      return NextResponse.json({ error: "Pinged a moment ago" }, { status: 429 });
    }

    const [me, friend] = await Promise.all([getUser(u.userId), getUser(friendId)]);
    const sent = await sendFriendPing(me, friend);
    if (!sent) return NextResponse.json({ error: "Set a ping channel on the Friends page first" }, { status: 400 });

    await db()
      .from("friendships")
      .update({ last_pinged_at: new Date().toISOString() })
      .eq("user_id", u.userId)
      .eq("friend_id", friendId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
