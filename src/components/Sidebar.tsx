"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/", label: "Model status", hint: "Passes and cost per model" },
  { href: "/race", label: "Live race", hint: "Watch models run a task" },
  { href: "/tasks", label: "Tasks and method", hint: "What is tested, how it is scored" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const nav = (
    <nav aria-label="Main" className="flex h-full flex-col">
      <div className="px-6 pb-8 pt-8">
        <p className="font-display text-2xl font-bold leading-none tracking-tight">Orbio Bench</p>
        <p className="mt-2 text-sm leading-snug text-slate">Passing code per dollar, measured on an Orbio key.</p>
      </div>
      <ul className="flex-1 space-y-1 px-3">
        {LINKS.map((l) => {
          const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-md border-l-4 px-3 py-2.5 ${
                  active ? "border-teal bg-white" : "border-transparent hover:bg-white/60"
                }`}
              >
                <span className="block font-display text-base font-semibold">{l.label}</span>
                <span className="block text-sm text-slate">{l.hint}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="px-6 pb-6 text-sm leading-snug text-slate">
        Every call goes through one Orbio key. Costs are what the gateway charged.
      </p>
    </nav>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-track bg-[#E6ECF2] md:block">{nav}</aside>

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="fixed left-3 top-3 z-30 flex h-11 items-center gap-2 rounded-md bg-white px-3 font-display text-sm font-semibold shadow-sm md:hidden"
      >
        <span aria-hidden className="block h-3 w-4 border-y-2 border-ink" />
        Menu
      </button>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/40" />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-[#E6ECF2] shadow-xl">{nav}</aside>
        </div>
      )}
    </>
  );
}
