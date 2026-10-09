import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { acceptTerms } from "@/app/actions/account";
import { auth, signIn } from "@/auth";
import { db } from "@/lib/supabase";
import { Wordmark } from "@/components/Logo";
import { AGE_BLOCKED_COOKIE, AGE_OK_COOKIE, LEGAL, MIN_AGE, ageFrom } from "@/lib/legal";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function safeNext(next: string | undefined) {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

async function continueToGoogle(formData: FormData) {
  "use server";
  const month = Number(formData.get("month"));
  const year = Number(formData.get("year"));
  const agreed = formData.get("agree") === "on";
  const next = safeNext(String(formData.get("next") ?? ""));
  const thisYear = new Date().getFullYear();
  if (!agreed || !(month >= 1 && month <= 12) || !(year >= thisYear - 120 && year <= thisYear)) {
    redirect(`/start?error=1&next=${encodeURIComponent(next)}`);
  }

  const jar = await cookies();
  const base = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };
  if (ageFrom(year, month) < MIN_AGE) {
    // Nothing is stored about this person. The cookie stops an immediate retry with a different year.
    jar.set(AGE_BLOCKED_COOKIE, "1", { ...base, maxAge: 60 * 60 * 24 * 30 });
    redirect("/start");
  }
  // Only the fact that the check passed, never the birth date.
  jar.set(AGE_OK_COOKIE, LEGAL.version, { ...base, maxAge: 15 * 60 });
  await signIn("google", { redirectTo: next });
}

export default async function StartPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const session = await auth();
  if (session?.user) {
    const { data } = await db().from("users").select("terms_version").eq("id", session.user.id).maybeSingle();
    if (data?.terms_version === LEGAL.version) redirect(safeNext(next));
    return <Reaccept next={safeNext(next)} />;
  }
  const blocked = (await cookies()).get(AGE_BLOCKED_COOKIE)?.value === "1";
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 101 }, (_, i) => thisYear - i);

  return (
    <div className="mx-auto max-w-md py-6">
      <Link href="/" aria-label="Unlocked home">
        <Wordmark />
      </Link>

      {blocked ? (
        <div className="card mt-8 space-y-3">
          <h1 className="font-display text-2xl font-extrabold">Sorry, you can&apos;t sign up right now</h1>
          <p className="text-muted">Unlocked is only for people {MIN_AGE} and older. We didn&apos;t save anything about you.</p>
          <Link href="/" className="btn-ghost">Back to home</Link>
        </div>
      ) : (
        <form action={continueToGoogle} className="card mt-8 space-y-5">
          <input type="hidden" name="next" value={safeNext(next)} />
          <div>
            <h1 className="font-display text-2xl font-extrabold">Before you sign in</h1>
            <p className="mt-1 text-muted">When were you born?</p>
          </div>
          <div className="grid grid-cols-[1.4fr_1fr] gap-3">
            <label className="block">
              <span className="label">Month</span>
              <select name="month" required defaultValue="" className="input mt-1.5">
                <option value="" disabled>Month</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Year</span>
              <select name="year" required defaultValue="" className="input num mt-1.5">
                <option value="" disabled>Year</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="agree" required className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand)]" />
            <span>
              I agree to the{" "}
              <Link href="/terms" target="_blank" className="font-semibold text-brand hover:underline">Terms of Service</Link> and{" "}
              <Link href="/privacy" target="_blank" className="font-semibold text-brand hover:underline">Privacy Policy</Link>.
            </span>
          </label>
          {error && <p className="text-sm text-bad">Pick your birth month and year, and tick the box to continue.</p>}
          <button className="btn w-full py-3.5">Continue with Google</button>
          <p className="text-xs text-muted">We only use this to check you can use Unlocked. We don&apos;t store your birth date.</p>
        </form>
      )}
    </div>
  );
}

function Reaccept({ next }: { next: string }) {
  return (
    <div className="mx-auto max-w-md py-6">
      <Wordmark />
      <form action={acceptTerms.bind(null, next)} className="card mt-8 space-y-5">
        <div>
          <h1 className="font-display text-2xl font-extrabold">We updated our terms</h1>
          <p className="mt-1 text-muted">Take a look, then agree to keep using Unlocked.</p>
        </div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="agree" required className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand)]" />
          <span>
            I agree to the{" "}
            <Link href="/terms" target="_blank" className="font-semibold text-brand hover:underline">Terms of Service</Link> and{" "}
            <Link href="/privacy" target="_blank" className="font-semibold text-brand hover:underline">Privacy Policy</Link>.
          </span>
        </label>
        <button className="btn w-full py-3.5">Continue</button>
      </form>
    </div>
  );
}
