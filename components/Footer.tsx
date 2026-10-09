import Link from "next/link";
import { LEGAL } from "@/lib/legal";

export default function Footer() {
  return (
    <footer className="mx-auto max-w-5xl px-4 pb-28 text-sm text-muted sm:pb-10">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-6">
        <span>© {new Date().getFullYear()} Unlocked</span>
        <Link href="/privacy" className="hover:text-text">Privacy Policy</Link>
        <Link href="/terms" className="hover:text-text">Terms of Service</Link>
        <a href={`mailto:${LEGAL.contactEmail}`} className="hover:text-text">Contact</a>
      </div>
    </footer>
  );
}
