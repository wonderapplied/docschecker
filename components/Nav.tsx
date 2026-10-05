import Link from "next/link";
import { auth, signOut } from "@/auth";

const LINKS = [
  ["/dashboard", "Dashboard"],
  ["/lobby", "Lobby"],
  ["/connect", "Connect"],
  ["/friends", "Friends"],
] as const;

export default async function Nav() {
  const session = await auth();
  return (
    <header className="border-b border-line">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
        <Link href="/" className="text-lg font-bold">
          🔓 Unlocked
        </Link>
        {session?.user && (
          <>
            <div className="flex flex-wrap gap-4 text-sm text-muted">
              {LINKS.map(([href, label]) => (
                <Link key={href} href={href} className="hover:text-text">
                  {label}
                </Link>
              ))}
            </div>
            <form
              className="ml-auto"
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button className="text-sm text-muted hover:text-text">Sign out</button>
            </form>
          </>
        )}
      </nav>
    </header>
  );
}
