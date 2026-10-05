import { NextResponse } from "next/server";
import { errorResponse, needsToken, requireUser } from "@/lib/api";
import { getActiveSession, pollSession, toView } from "@/lib/sessions";

// The dashboard calls this every ~45s while it's open.
export async function POST() {
  const u = await requireUser();
  if ("error" in u) return u.error;
  if (!u.accessToken) return needsToken();
  try {
    const s = await getActiveSession(u.userId);
    if (!s) return NextResponse.json({ session: null });
    return NextResponse.json({ session: await toView(await pollSession(s, u.accessToken)) });
  } catch (err) {
    return errorResponse(err);
  }
}
