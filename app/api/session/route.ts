import { NextResponse } from "next/server";
import { errorResponse, needsToken, requireUser, timeZoneOf } from "@/lib/api";
import { endSession, getActiveSession, startSession, toView } from "@/lib/sessions";

export async function GET(req: Request) {
  const u = await requireUser();
  if ("error" in u) return u.error;
  try {
    const s = await getActiveSession(u.userId);
    const tz = timeZoneOf({ tz: new URL(req.url).searchParams.get("tz") });
    return NextResponse.json({ session: s ? await toView(s, tz) : null });
  } catch (err) {
    return errorResponse(err);
  }
}

const positiveInt = (v: unknown) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n <= 1_000_000 ? n : null;
};

export async function POST(req: Request) {
  const u = await requireUser();
  if ("error" in u) return u.error;
  if (!u.accessToken) return needsToken();

  const body = await req.json().catch(() => ({}));
  const docId = typeof body.docId === "string" && /^[\w-]{10,}$/.test(body.docId) ? body.docId : null;
  const goalWords = body.goalWords == null || body.goalWords === "" ? null : positiveInt(body.goalWords);
  const goalSentences = body.goalSentences == null || body.goalSentences === "" ? null : positiveInt(body.goalSentences);
  const deadline = body.deadline && !Number.isNaN(Date.parse(body.deadline)) ? new Date(body.deadline).toISOString() : null;

  if (!docId) return NextResponse.json({ error: "Pick a doc first" }, { status: 400 });
  if (!goalWords && !goalSentences) {
    return NextResponse.json({ error: "Set a word goal, a sentence goal, or both" }, { status: 400 });
  }

  try {
    const s = await startSession(u.userId, u.accessToken, {
      docId,
      docTitle: typeof body.docTitle === "string" ? body.docTitle.slice(0, 200) : null,
      showTitle: !!body.showTitle,
      goalWords,
      goalSentences,
      deadline,
    });
    return NextResponse.json({ session: await toView(s, timeZoneOf(body)) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE() {
  const u = await requireUser();
  if ("error" in u) return u.error;
  try {
    await endSession(u.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
