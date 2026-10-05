import { NextResponse } from "next/server";
import { errorResponse, requireUser } from "@/lib/api";
import { db } from "@/lib/supabase";

export async function GET() {
  const u = await requireUser();
  if ("error" in u) return u.error;
  try {
    const [{ data: me, error: meErr }, { data: rows, error }] = await Promise.all([
      db().from("users").select("invite_code, discord_id").eq("id", u.userId).single(),
      db()
        .from("friendships")
        .select("friend_id, users!friendships_friend_id_fkey(name, avatar)")
        .eq("user_id", u.userId)
        .eq("status", "accepted"),
    ]);
    if (meErr) throw meErr;
    if (error) throw error;
    const friends = (rows ?? []).map((r) => {
      const f = (Array.isArray(r.users) ? r.users[0] : r.users) as { name: string | null; avatar: string | null } | null;
      return { id: r.friend_id, name: f?.name ?? "Friend", avatar: f?.avatar ?? null };
    });
    return NextResponse.json({ inviteCode: me.invite_code, discordId: me.discord_id, friends });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: Request) {
  const u = await requireUser();
  if ("error" in u) return u.error;
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  try {
    const { error } = await db()
      .from("friendships")
      .delete()
      .or(`and(user_id.eq.${u.userId},friend_id.eq.${id}),and(user_id.eq.${id},friend_id.eq.${u.userId})`);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
