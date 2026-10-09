import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { LEGAL, MIN_AGE } from "@/lib/legal";

export const metadata: Metadata = { title: "Privacy Policy · Unlocked" };

export default function PrivacyPage() {
  const email = <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>;
  return (
    <LegalPage title="Privacy Policy">
      <p>
        Unlocked is run by {LEGAL.operator} (&quot;we&quot;). This policy explains what Unlocked collects, why, who can see it, and how to
        delete it. The short version: we count the words in the one Google Doc you pick, your friends see the numbers, and nobody sees
        your writing.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>From your Google account when you sign in:</strong> your name, email address, profile photo, and Google account ID.
        </li>
        <li>
          <strong>From the Google Doc you pick:</strong> its ID and title. Every 45 seconds or so while your dashboard is open, our server
          reads the doc&apos;s text to count words and sentences. <strong>We don&apos;t store the text.</strong> It is counted in memory and
          thrown away.
        </li>
        <li>
          <strong>Session data:</strong> your goals, deadline, word and sentence counts over time, when you started and unlocked, and
          notes our anti-cheat checks make (like how many pasted words didn&apos;t count).
        </li>
        <li>
          <strong>A word tally during a session:</strong> to tell what you added from what was already in the doc, we keep a list of
          which words appeared in the doc when the session started and how many times. It is deleted when the session ends.
        </li>
        <li>
          <strong>Friends:</strong> who you&apos;re friends with in Unlocked and when you last pinged each of them.
        </li>
        <li>
          <strong>Discord, if you set it up:</strong> your Discord user ID and username (from Connect Discord) and the channel webhook URL
          you paste in.
        </li>
        <li>
          <strong>Records:</strong> when you agreed to these terms. When you sign up we ask for your birth month and year only to check
          your age; <strong>we don&apos;t store it</strong>.
        </li>
        <li>
          <strong>Technical data:</strong> our hosting provider keeps standard server logs (like IP address and browser type) for security
          and debugging.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To count your progress, show it to you and your friends, and send the unlock and ping messages you set up.</li>
        <li>To work out streaks and personal bests.</li>
        <li>To keep Unlocked working and secure.</li>
      </ul>
      <p>We don&apos;t sell your data, show ads, or use your data to train AI models.</p>

      <h2>Google user data</h2>
      <p>
        Unlocked asks Google only for the <strong>drive.file</strong> permission, which lets it open just the docs you choose in the Google
        file picker, not the rest of your Drive. Unlocked&apos;s use and transfer of information received from Google APIs will adhere to the{" "}
        <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements. In particular, we use Google data only to provide Unlocked&apos;s features, we don&apos;t
        use it for advertising, we don&apos;t transfer it except as described here or required by law, and no person reads your doc
        content.
      </p>
      <p>
        Your Google sign-in tokens are kept in an encrypted cookie in your browser, not in our database. You can remove Unlocked&apos;s
        access any time at{" "}
        <a href="https://myaccount.google.com/connections" target="_blank" rel="noreferrer">
          myaccount.google.com/connections
        </a>
        .
      </p>

      <h2>Who can see your information</h2>
      <ul>
        <li>
          <strong>Your friends in Unlocked</strong> see your name, profile photo, progress numbers, status, streak, when you unlocked, and
          your doc&apos;s title only if you turn that on. They never see your doc&apos;s text.
        </li>
        <li>
          <strong>People in a Discord channel</strong> you or a friend connect see the unlock and ping messages, which include your name or
          Discord @mention.
        </li>
        <li>
          <strong>Service providers</strong> that run Unlocked for us: Google (sign-in, Docs, file picker), Supabase (database), Vercel
          (hosting), and Discord (messages you set up). They handle data under their own privacy policies.
        </li>
        <li>
          <strong>Legal reasons:</strong> if the law requires it, or to protect people&apos;s safety.
        </li>
      </ul>

      <h2>Cookies and storage</h2>
      <p>
        We use cookies to keep you signed in, to remember that you completed the age question, and to secure the Discord connection. Your
        browser also stores small settings, like whether you&apos;ve already seen an unlock celebration. We don&apos;t use advertising or
        tracking cookies.
      </p>

      <h2>Children</h2>
      <p>
        Unlocked is not for children under {MIN_AGE}. We ask for age before sign-in and don&apos;t create an account for anyone under{" "}
        {MIN_AGE}. If you believe a child under {MIN_AGE} has an account, email {email} and we&apos;ll delete it.
      </p>

      <h2>How long we keep it, and deleting it</h2>
      <p>
        We keep your account data until you delete your account. You can delete it any time from the{" "}
        <Link href="/friends">Friends page</Link> (Delete account). That removes your account, sessions, progress history, friendships and
        Discord settings from our database, and revokes Unlocked&apos;s Google access. Server logs and backups may take up to 30 days to
        clear.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask for a copy of your data, ask us to correct it, or ask us to delete it by emailing {email}. Depending on where you live
        (for example California, the EU or the UK), you may have more rights under local law, and we&apos;ll honor them.
      </p>

      <h2>Security</h2>
      <p>
        We use encrypted connections, keep database access limited to our server, and store as little as we can. No system is perfectly
        secure, so we can&apos;t promise your data will never be exposed. If a breach affects you, we&apos;ll tell you.
      </p>

      <h2>Changes</h2>
      <p>
        If we change this policy, we&apos;ll update the date at the top. For big changes, especially to how we use Google data, we&apos;ll ask
        you to agree again before they apply to you.
      </p>

      <h2>Contact</h2>
      <p>Questions or requests: {email}.</p>
    </LegalPage>
  );
}
