import { SignJWT } from "jose";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";

// A short-lived Supabase JWT for this user so Realtime enforces the lobby_status RLS policy.
export async function GET() {
  const u = await requireUser();
  if ("error" in u) return u.error;
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) return NextResponse.json({ error: "SUPABASE_JWT_SECRET is not set" }, { status: 500 });

  const expiresIn = 60 * 60;
  const token = await new SignJWT({ role: "authenticated" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(u.userId)
    .setAudience("authenticated")
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .sign(new TextEncoder().encode(secret));
  return NextResponse.json({ token, expiresAt: Date.now() + expiresIn * 1000 });
}
