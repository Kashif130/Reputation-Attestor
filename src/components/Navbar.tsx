"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import WalletButton from "./WalletButton";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/dashboard", label: "My Profile" },
  { href: "/registry", label: "Registry" },
  { href: "/admin", label: "Admin" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-ink-700/60 bg-ink-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-signal-400 to-signal-600 text-sm font-bold text-ink-950">
            RA
          </span>
          <span className="text-sm font-semibold tracking-tight text-slate-100">
            Reputation<span className="text-signal-400">Attestor</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-ink-800 text-signal-400"
                    : "text-slate-400 hover:bg-ink-800/60 hover:text-slate-200"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <WalletButton />
      </div>

      <nav className="flex items-center gap-1 overflow-x-auto border-t border-ink-800 px-4 py-2 md:hidden">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium ${
                active ? "bg-ink-800 text-signal-400" : "text-slate-400"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
