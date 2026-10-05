import { NextResponse } from "next/server";
import { errorResponse, needsToken, requireUser } from "@/lib/api";
import { count, extractText } from "@/lib/count";
import { getDoc } from "@/lib/google";

// Current counts for a picked doc, shown on /connect before a session starts.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  if ("error" in u) return u.error;
  if (!u.accessToken) return needsToken();
  try {
    const { id } = await ctx.params;
    const doc = await getDoc(id, u.accessToken);
    return NextResponse.json({ title: doc.title ?? null, ...count(extractText(doc)) });
  } catch (err) {
    return errorResponse(err);
  }
}
