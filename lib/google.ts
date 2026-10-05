import "server-only";
import type { GoogleDoc } from "./count";

export class GoogleApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Reads a doc the user picked. Works with the `drive.file` scope only for picked files. */
export async function getDoc(docId: string, accessToken: string): Promise<GoogleDoc> {
  const url = `https://docs.googleapis.com/v1/documents/${encodeURIComponent(docId)}?includeTabsContent=true`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const msg =
      res.status === 403 || res.status === 404
        ? "Can't read that doc. Pick it again on the Connect page so Unlocked gets access."
        : res.status === 401
          ? "Your Google sign-in expired. Sign out and back in."
          : `Google Docs API error ${res.status}`;
    throw new GoogleApiError(res.status, msg);
  }
  return res.json();
}
