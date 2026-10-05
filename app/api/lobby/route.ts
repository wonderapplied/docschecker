import { NextResponse } from "next/server";
import { errorResponse, requireUser } from "@/lib/api";
import { db } from "@/lib/supabase";

// Initial lobby load; live updates come from Supabase Realtime.
export async function GET() {
  const u = await requireUser();
  if ("error" in u) return u.error;
  try {
    const { data: friends, error: fErr } = await db()
      .from("friendships")
      .select("friend_id")
      .eq("user_id", u.userId)
      .eq("status", "accepted");
    if (fErr) throw fErr;
    const ids = [u.userId, ...(friends ?? []).map((f) => f.friend_id)];
    const { data, error } = await db().from("lobby_status").select("*").in("user_id", ids);
    if (error) throw error;
    return NextResponse.json({ me: u.userId, rows: data ?? [] });
  } catch (err) {
    return errorResponse(err);
  }
}
