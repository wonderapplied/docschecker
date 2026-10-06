import { NextResponse } from "next/server";
import { errorResponse, requireUser } from "@/lib/api";
import { db } from "@/lib/supabase";

// New invite code; the old link stops working. Existing friends stay.
export async function POST() {
  const u = await requireUser();
  if ("error" in u) return u.error;
  const code = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, "0")).join("");
  try {
    const { error } = await db().from("users").update({ invite_code: code }).eq("id", u.userId);
    if (error) throw error;
    return NextResponse.json({ inviteCode: code });
  } catch (err) {
    return errorResponse(err);
  }
}
