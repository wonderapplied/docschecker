"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const DESKTOP = [
  ["/dashboard", "Dashboard"],
  ["/lobby", "Lobby"],
  ["/connect", "New session"],
  ["/friends", "Friends"],
] as const;

const icons = {
  dashboard: <path d="M4 13a8 8 0 1 1 16 0M12 13l4-4" strokeLinecap="round" />,
  lobby: (
    <>
      <circle cx="8" cy="9" r="3" />
      <circle cx="16" cy="9" r="3" />
      <path d="M2.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5M13 15c.9-.3 1.9-.5 3-.5 2.5 0 4.7 1.5 5.5 4.5" strokeLinecap="round" />
    </>
  ),
  friends: (
    <>
      <circle cx="10" cy="8" r="3.5" />
      <path d="M3.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M18 8v6M15 11h6" strokeLinecap="round" />
    </>
  ),
};

const MOBILE = [
  ["/dashboard", "Dashboard", icons.dashboard],
  ["/lobby", "Lobby", icons.lobby],
  ["/friends", "Friends", icons.friends],
] as const;

export function DesktopLinks() {
  const path = usePathname();
  return (
    <div className="hidden gap-1 sm:flex">
      {DESKTOP.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
            path === href ? "bg-white/8 text-text" : "text-muted hover:text-text"
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

export function MobileTabBar() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      <div className="grid grid-cols-3">
        {MOBILE.map(([href, label, icon]) => {
          const active = path === href || (href === "/dashboard" && path === "/connect");
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 py-2.5 text-xs font-semibold ${active ? "text-brand" : "text-muted"}`}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                {icon}
              </svg>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
