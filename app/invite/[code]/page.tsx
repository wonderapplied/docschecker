import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePageUser } from "@/lib/require-page-user";
import { db } from "@/lib/supabase";

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const session = await requirePageUser(`/invite/${code}`);
  const me = session.user.id;

  const { data: inviter } = await db().from("users").select("id, name").eq("invite_code", code).maybeSingle();
  if (!inviter) {
    return (
      <div className="card mx-auto max-w-md text-center">
        <p>That invite link doesn&apos;t work.</p>
        <Link href="/friends" className="btn mt-4">Go to Friends</Link>
      </div>
    );
  }
  if (inviter.id === me) redirect("/friends");

  const { error } = await db()
    .from("friendships")
    .upsert(
      [
        { user_id: me, friend_id: inviter.id, status: "accepted" },
        { user_id: inviter.id, friend_id: me, status: "accepted" },
      ],
      { onConflict: "user_id,friend_id" },
    );
  if (error) throw error;
  redirect("/lobby");
}
