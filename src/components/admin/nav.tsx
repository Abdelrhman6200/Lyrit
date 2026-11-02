"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { CloseIcon, MenuIcon } from "@/components/ui/icons";

export type AdminNavItem = { href: string; label: string };

export function AdminNav({ items, user }: { items: AdminNavItem[]; user: { name: string; role: string } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = (
    <ul className="space-y-0.5">
      {items.map((i) => {
        const active = i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href);
        return (
          <li key={i.href}>
            <Link href={i.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={cn("block rounded-lg px-3 py-2 text-sm transition-colors", active ? "bg-ivory/15 text-white" : "text-ivory/75 hover:bg-ivory/10 hover:text-white")}>
              {i.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
  return (
    <>
      <div className="flex h-14 items-center justify-between bg-forest px-4 text-ivory lg:hidden">
        <Link href="/admin" className="font-serif text-xl tracking-[0.3em]">LYRIT</Link>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Toggle admin menu" className="p-2">{open ? <CloseIcon /> : <MenuIcon />}</button>
      </div>
      {open && <nav aria-label="Admin" className="bg-forest px-3 pb-4 lg:hidden">{links}</nav>}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-forest p-4 text-ivory lg:flex">
        <Link href="/admin" className="px-3 py-4 font-serif text-2xl tracking-[0.3em]">LYRIT</Link>
        <p className="px-3 text-[11px] uppercase tracking-widest text-ivory/50">Admin</p>
        <nav aria-label="Admin" className="mt-4 flex-1 overflow-y-auto">{links}</nav>
        <div className="border-t border-ivory/15 px-3 pt-4 text-xs text-ivory/70">
          <p className="font-medium text-ivory">{user.name}</p>
          <p>{user.role.replace("_", " ").toLowerCase()}</p>
          <Link href="/" className="mt-3 inline-block underline">View store ↗</Link>
        </div>
      </aside>
    </>
  );
}
