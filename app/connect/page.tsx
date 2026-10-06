import Connect from "@/components/Connect";
import { requirePageUser } from "@/lib/require-page-user";

export default async function NewSessionPage() {
  const session = await requirePageUser("/connect");
  return <Connect accessToken={session.error ? null : (session.accessToken ?? null)} />;
}
