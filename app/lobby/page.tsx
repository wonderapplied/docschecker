import Lobby from "@/components/Lobby";
import { requirePageUser } from "@/lib/require-page-user";

export default async function LobbyPage() {
  await requirePageUser("/lobby");
  return <Lobby />;
}
