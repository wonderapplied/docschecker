import Dashboard from "@/components/Dashboard";
import { requirePageUser } from "@/lib/require-page-user";

export default async function DashboardPage() {
  const session = await requirePageUser("/dashboard");
  return <Dashboard accessToken={session.error ? null : (session.accessToken ?? null)} />;
}
