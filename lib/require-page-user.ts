import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LEGAL } from "./legal";
import { db } from "./supabase";

export async function requirePageUser(from: string) {
  const session = await auth();
  if (!session?.user?.id) redirect(`/?next=${encodeURIComponent(from)}`);
  // Terms changed since this person agreed: ask again before showing anything.
  const { data } = await db().from("users").select("terms_version").eq("id", session.user.id).maybeSingle();
  if (data?.terms_version !== LEGAL.version) redirect(`/start?next=${encodeURIComponent(from)}`);
  return session;
}
