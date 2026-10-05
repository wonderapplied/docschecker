import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client: bypasses RLS, so every caller must check the signed-in user itself.
export function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars are missing (see .env.example)");
  return createClient(url, key, { auth: { persistSession: false } });
}
