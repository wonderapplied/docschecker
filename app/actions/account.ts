"use server";

import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { LEGAL } from "@/lib/legal";
import { db } from "@/lib/supabase";

/** Deletes everything we hold about the signed-in user and revokes Unlocked's Google access. */
export async function deleteAccount() {
  const session = await auth();
  if (!session?.user?.id) return;

  if (session.accessToken) {
    // Revoking one token revokes the whole grant, refresh token included.
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: session.accessToken }),
    }).catch(() => {});
  }
  // Sessions, snapshots, friendships and lobby rows go with it (on delete cascade).
  const { error } = await db().from("users").delete().eq("id", session.user.id);
  if (error) throw error;
  await signOut({ redirectTo: "/?deleted=1" });
}

/** Re-accepting updated Terms/Privacy while signed in. */
export async function acceptTerms(next: string) {
  const session = await auth();
  if (!session?.user?.id) return;
  const { error } = await db()
    .from("users")
    .update({ terms_accepted_at: new Date().toISOString(), terms_version: LEGAL.version })
    .eq("id", session.user.id);
  if (error) throw error;
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
}
