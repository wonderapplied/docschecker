import Friends from "@/components/Friends";
import { requirePageUser } from "@/lib/require-page-user";

export default async function FriendsPage({ searchParams }: { searchParams: Promise<{ discord?: string }> }) {
  await requirePageUser("/friends");
  const { discord } = await searchParams;
  return <Friends siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"} discordResult={discord ?? null} />;
}
