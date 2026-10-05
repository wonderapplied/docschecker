import Dashboard from "@/components/Dashboard";
import { requirePageUser } from "@/lib/require-page-user";

export default async function DashboardPage() {
  await requirePageUser("/dashboard");
  return <Dashboard />;
}
