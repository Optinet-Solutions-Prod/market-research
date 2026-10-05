"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/", label: "Opportunity Board" },
  { href: "/scan", label: "Run Market Scan" },
  { href: "/catalog", label: "Catalog" },
  { href: "/scoring", label: "Scoring Model" },
  { href: "/handoffs", label: "Build Handoff" },
  { href: "/providers", label: "Data Providers" },
];

export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) =>
    href === "/" ? path === "/" || path.startsWith("/opportunities") : path.startsWith(href);

  return (
    <aside className="border-b border-line bg-[rgba(7,11,23,.88)] backdrop-blur-md lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0">
      <div className="flex items-center justify-between px-5 py-4 lg:block lg:px-[18px] lg:py-6">
        <Link href="/" className="block">
          <div className="text-xl font-extrabold tracking-tight">Opportunity Radar</div>
          <div className="mt-1 text-xs text-muted">Autonomous affiliate market intelligence</div>
        </Link>
        <button className="btn lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle navigation">
          Menu
        </button>
      </div>
      <nav className={`${open ? "grid" : "hidden"} gap-1.5 px-4 pb-4 lg:mt-3 lg:grid lg:px-[18px]`}>
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={() => setOpen(false)}
            className={`rounded-[10px] px-3 py-2.5 text-sm transition ${
              active(l.href) ? "bg-raised text-white" : "text-muted hover:bg-raised hover:text-white"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
