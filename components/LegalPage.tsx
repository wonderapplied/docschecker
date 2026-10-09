import Link from "next/link";
import { LEGAL } from "@/lib/legal";
import { Wordmark } from "./Logo";

/** Shared layout for the Privacy Policy and Terms: readable width, plain headings. */
export default function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl space-y-4 leading-relaxed text-muted [&_a]:font-semibold [&_a]:text-brand [&_a:hover]:underline [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-text [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_strong]:text-text [&_ul]:space-y-1.5">
      <Link href="/" aria-label="Unlocked home" className="!font-normal !text-text hover:!no-underline">
        <Wordmark />
      </Link>
      <h1 className="pt-4 font-display text-4xl font-extrabold tracking-tight text-text">{title}</h1>
      <p className="text-sm">Effective {LEGAL.effectiveDate}</p>
      {children}
    </article>
  );
}
