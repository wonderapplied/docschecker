import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { GoogleApiError } from "./google";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) } as const;
  return { session, userId: session.user.id, accessToken: session.accessToken } as const;
}

export function needsToken() {
  return NextResponse.json({ error: "Your Google sign-in expired. Sign out and back in." }, { status: 401 });
}

export function errorResponse(err: unknown) {
  if (err instanceof GoogleApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status === 401 ? 401 : 400 });
  }
  console.error(err);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}
