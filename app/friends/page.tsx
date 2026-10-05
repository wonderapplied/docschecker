import Friends from "@/components/Friends";
import { requirePageUser } from "@/lib/require-page-user";

export default async function FriendsPage() {
  await requirePageUser("/friends");
  return <Friends siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"} />;
}
