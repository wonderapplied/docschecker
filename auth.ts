import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type {} from "next-auth/jwt";
import { cookies } from "next/headers";
import { AGE_OK_COOKIE, LEGAL } from "@/lib/legal";
import { db } from "@/lib/supabase";

// drive.file is non-sensitive: the app only sees docs the user picks in the Google Picker.
const SCOPES = ["openid", "email", "profile", "https://www.googleapis.com/auth/drive.file"];

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    error?: "RefreshTokenError";
    user: { id: string; name?: string | null; email?: string | null; image?: string | null };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    access_token?: string;
    expires_at?: number;
    refresh_token?: string;
    error?: "RefreshTokenError";
  }
}

async function upsertUser(
  sub: string,
  email: string | null | undefined,
  name: string | null | undefined,
  avatar: string | null | undefined,
  acceptedTerms: boolean,
) {
  const { data, error } = await db()
    .from("users")
    .upsert(
      {
        google_sub: sub,
        email,
        name,
        avatar,
        ...(acceptedTerms ? { terms_accepted_at: new Date().toISOString(), terms_version: LEGAL.version } : {}),
      },
      { onConflict: "google_sub" },
    )
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/** True when this browser just answered the age question and agreed to the Terms. */
async function passedAgeCheck() {
  return (await cookies()).get(AGE_OK_COOKIE)?.value === LEGAL.version;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: { scope: SCOPES.join(" "), access_type: "offline", prompt: "consent" },
      },
    }),
  ],
  pages: { signIn: "/" },
  callbacks: {
    // No account without the age question first (COPPA: ask age before collecting anything).
    // Returning users who already accepted the current Terms skip it.
    async signIn({ account }) {
      if (!account) return false;
      if (await passedAgeCheck()) return true;
      const { data } = await db()
        .from("users")
        .select("terms_version")
        .eq("google_sub", account.providerAccountId)
        .maybeSingle();
      return data?.terms_version === LEGAL.version ? true : "/start";
    },
    async jwt({ token, account, profile }) {
      if (account) {
        token.uid = await upsertUser(
          account.providerAccountId,
          profile?.email,
          profile?.name,
          profile?.picture,
          await passedAgeCheck(),
        );
        return {
          ...token,
          access_token: account.access_token,
          expires_at: account.expires_at,
          refresh_token: account.refresh_token,
        };
      }
      if (token.expires_at && Date.now() < token.expires_at * 1000 - 60_000) return token;
      if (!token.refresh_token) return { ...token, error: "RefreshTokenError" as const };

      try {
        const res = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          body: new URLSearchParams({
            client_id: process.env.AUTH_GOOGLE_ID!,
            client_secret: process.env.AUTH_GOOGLE_SECRET!,
            grant_type: "refresh_token",
            refresh_token: token.refresh_token,
          }),
        });
        const fresh = await res.json();
        if (!res.ok) throw fresh;
        return {
          ...token,
          access_token: fresh.access_token,
          expires_at: Math.floor(Date.now() / 1000 + fresh.expires_in),
          refresh_token: fresh.refresh_token ?? token.refresh_token,
          error: undefined,
        };
      } catch (err) {
        console.error("Google token refresh failed", err);
        return { ...token, error: "RefreshTokenError" as const };
      }
    },
    async session({ session, token }) {
      session.user.id = token.uid!;
      // The Picker runs in the browser and needs the token; it's the user's own token.
      session.accessToken = token.access_token;
      session.error = token.error;
      return session;
    },
  },
});
