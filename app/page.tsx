import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function Home({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const target = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const session = await auth();
  if (session?.user) redirect(target);

  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <h1 className="text-5xl font-extrabold tracking-tight">🔓 Unlocked</h1>
      <p className="mt-4 text-lg text-muted">
        Connect a Google Doc, set a goal, and write. Your friends watch the bar fill up. Hit the goal and
        everyone gets pinged that you&apos;re ready to play.
      </p>
      <form
        className="mt-8"
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: target });
        }}
      >
        <button className="btn text-lg">Sign in with Google</button>
      </form>
      <ul className="mt-10 space-y-2 text-left text-sm text-muted">
        <li>• Unlocked can only open docs you pick, never your whole Drive.</li>
        <li>• Friends see numbers only, never your text.</li>
        <li>• Only words you add this session count, and deleting takes them back off.</li>
      </ul>
    </div>
  );
}
