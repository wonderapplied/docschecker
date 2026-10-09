import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { LEGAL, MIN_AGE } from "@/lib/legal";

export const metadata: Metadata = { title: "Terms of Service · Unlocked" };

export default function TermsPage() {
  const email = <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>;
  return (
    <LegalPage title="Terms of Service">
      <p>
        These terms are an agreement between you and {LEGAL.operator} (&quot;we&quot;), who runs Unlocked. By using Unlocked you agree to
        them and to our <Link href="/privacy">Privacy Policy</Link>. If you don&apos;t agree, don&apos;t use Unlocked.
      </p>

      <h2>Who can use Unlocked</h2>
      <ul>
        <li>You must be at least {MIN_AGE} years old.</li>
        <li>
          If you&apos;re under 18 (or the age of adulthood where you live), a parent or guardian must agree to these terms for you, and
          they&apos;re responsible for your use of Unlocked.
        </li>
        <li>You need a Google account, and you must follow Google&apos;s terms when using it with Unlocked.</li>
      </ul>

      <h2>Your account</h2>
      <p>
        Keep your Google account secure; you&apos;re responsible for what happens in Unlocked under it. Only add friends you know, since
        friends can see your progress. You can delete your account any time from the <Link href="/friends">Friends page</Link>.
      </p>

      <h2>Your docs stay yours</h2>
      <p>
        You own everything you write. Unlocked only reads the doc you pick to count words and sentences; it doesn&apos;t store your text
        or claim any rights to it.
      </p>

      <h2>Play fair</h2>
      <p>When you use Unlocked, don&apos;t:</p>
      <ul>
        <li>harass, threaten, or spam anyone, including with lobby or Discord pings;</li>
        <li>post anything illegal, hateful, or sexual involving minors through Discord messages or doc titles;</li>
        <li>pretend to be someone else, or use someone else&apos;s account;</li>
        <li>try to see other people&apos;s data, break our security, or overload the service;</li>
        <li>use bots or scripts to fake progress or scrape the site.</li>
      </ul>
      <p>
        Unlocked&apos;s anti-cheat checks are a friendly guess, not a judgment about anyone. We may suspend or remove accounts that break
        these rules.
      </p>

      <h2>Other services</h2>
      <p>
        Unlocked works with Google and Discord. We don&apos;t control them and aren&apos;t responsible for them; their own terms and
        privacy policies apply when you use them.
      </p>

      <h2>No guarantees</h2>
      <p>
        Unlocked is a free tool provided <strong>&quot;as is&quot;</strong> and <strong>&quot;as available&quot;</strong>, without warranties
        of any kind. Counts can be wrong, pings can fail, and the service can go down or change. Don&apos;t rely on Unlocked for anything
        important, like school deadlines.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent the law allows, we aren&apos;t liable for any indirect, incidental, special, or consequential damages, or for
        lost data, grades, or time, from using or not being able to use Unlocked. Our total liability for any claim about Unlocked is
        limited to $50 USD. Some places don&apos;t allow these limits, so they may not all apply to you.
      </p>

      <h2>Ending things</h2>
      <p>
        You can stop using Unlocked and delete your account whenever you like. We may suspend or end your access if you break these terms,
        or shut Unlocked down, with notice when we reasonably can.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms. We&apos;ll change the date at the top, and for big changes we&apos;ll ask you to agree again before they
        apply to you.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of {LEGAL.governingState}, United States, without regard to conflict-of-law rules, except
        where the law where you live says otherwise.
      </p>

      <h2>Contact</h2>
      <p>Questions about these terms: {email}.</p>
    </LegalPage>
  );
}
