import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Wordmark } from "./Logo";
import { DesktopLinks, MobileTabBar } from "./NavLinks";

export default async function Nav() {
  const session = await auth();
  // Signed out, the landing page carries the brand itself.
  if (!session?.user) return null;
  const { name, image } = session.user;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <Link href="/dashboard" aria-label="Unlocked home">
            <Wordmark />
          </Link>
          <DesktopLinks />
          <details className="relative ml-auto">
            <summary className="flex cursor-pointer list-none items-center rounded-full ring-brand/60 hover:ring-2" aria-label="Account">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-panel-2 font-display font-bold">
                  {(name ?? "?")[0]}
                </span>
              )}
            </summary>
            <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-line bg-panel p-2 shadow-xl">
              <p className="truncate px-3 py-2 text-sm text-muted">{name}</p>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-white/5">Sign out</button>
              </form>
            </div>
          </details>
        </nav>
      </header>
      <MobileTabBar />
    </>
  );
}
