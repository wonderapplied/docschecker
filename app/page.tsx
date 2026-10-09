import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import Logo, { Wordmark } from "@/components/Logo";
import ProgressBar from "@/components/ProgressBar";
import ProgressRing from "@/components/ProgressRing";
import { STATUS_PILL } from "@/components/status";
import type { Status } from "@/lib/progress";

const POINTS = [
  {
    title: "Only the doc you pick",
    body: "Unlocked opens the one Google Doc you choose, never the rest of your Drive.",
    icon: <path d="M7 3h7l5 5v13H7zM14 3v5h5" strokeLinejoin="round" />,
  },
  {
    title: "Friends see numbers, not words",
    body: "Your lobby sees your progress bar. Your writing stays yours.",
    icon: (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
  },
  {
    title: "Only new words count",
    body: "What's already in the doc doesn't count, and pasting doesn't either.",
    icon: <path d="M12 5v14M5 12h14" strokeLinecap="round" />,
  },
];

const PREVIEW: { name: string; color: string; percent: number; status: Status; label: string }[] = [
  { name: "Jordan", color: "#2a9d8f", percent: 100, status: "unlocked", label: "Unlocked" },
  { name: "Priya", color: "#e76f51", percent: 82, status: "almost", label: "Almost there" },
  { name: "Marcus", color: "#457b9d", percent: 41, status: "writing", label: "Writing" },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ next?: string; deleted?: string }> }) {
  const { next, deleted } = await searchParams;
  const target = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const session = await auth();
  if (session?.user) redirect(target);

  return (
    <div className="grid items-center gap-12 py-4 lg:grid-cols-[1.1fr_1fr] lg:py-12">
      <div>
        {deleted && (
          <p role="status" className="mb-6 rounded-2xl bg-good/10 px-4 py-3 text-sm text-good">
            Your account and data were deleted.
          </p>
        )}
        <Wordmark />
        <h1 className="mt-8 font-display text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl">
          Write first.
          <br />
          <span className="text-brand">Then play.</span>
        </h1>
        <p className="mt-5 max-w-md text-lg text-muted">
          Connect a Google Doc and set a goal. Your friends watch your bar fill up, and when you hit it, the whole group gets pinged that
          you&apos;re free.
        </p>
        <Link href={`/start?next=${encodeURIComponent(target)}`} className="btn mt-8 px-6 py-3.5 text-lg">
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
          </svg>
          Sign in with Google
        </Link>
        <p className="mt-3 text-xs text-muted">
          By continuing you agree to the{" "}
          <Link href="/terms" className="underline hover:text-text">Terms</Link> and{" "}
          <Link href="/privacy" className="underline hover:text-text">Privacy Policy</Link>.
        </p>
        <ul className="mt-10 space-y-4">
          {POINTS.map((p) => (
            <li key={p.title} className="flex gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/12 text-brand">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  {p.icon}
                </svg>
              </span>
              <span>
                <span className="block font-semibold">{p.title}</span>
                <span className="block text-sm text-muted">{p.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Product preview: what the lobby looks like on game night. */}
      <div aria-hidden className="relative">
        <div className="card relative z-10 mx-auto flex max-w-sm flex-col items-center gap-3 shadow-2xl">
          <p className="self-start text-sm font-semibold text-muted">History essay · 1h 12m in</p>
          <ProgressRing percent={81} status="almost" size={180} label="Almost there" />
          <p className="num text-sm text-muted">978 / 1,200 words</p>
        </div>
        <div className="-mt-6 space-y-3 rounded-3xl border border-line bg-panel-2 p-5 pt-10">
          {PREVIEW.map((f) => (
            <div key={f.name} className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full font-display font-bold text-white" style={{ background: f.color }}>
                {f.name[0]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-semibold">{f.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_PILL[f.status]}`}>
                    {f.status === "unlocked" && <Logo size={11} open className="-mt-0.5 mr-1 inline" />}
                    {f.label}
                  </span>
                </div>
                <ProgressBar percent={f.percent} status={f.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
