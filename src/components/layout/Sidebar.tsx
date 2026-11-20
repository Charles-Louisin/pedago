"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpenCheck, CalendarDays, FileSearch, GitBranch, LayoutGrid, LogOut, Sparkles, Users } from "lucide-react";
import { clsx } from "clsx";
import { PedagoWordmark } from "@/components/brand/PedagoMark";

const SECTIONS = [
  { title: "Vue d'ensemble", items: [{ href: "/", label: "Tableau de bord", icon: LayoutGrid }] },
  {
    title: "Bibliothèque",
    items: [
      { href: "/ressources", label: "Relecture & ressources", icon: BookOpenCheck },
      { href: "/referentiel", label: "Référentiel", icon: GitBranch },
      { href: "/sources", label: "Sources officielles", icon: FileSearch },
    ],
  },
  { title: "Production", items: [{ href: "/ia", label: "Usine IA", icon: Sparkles }] },
  {
    title: "Administration",
    admin: true,
    items: [
      { href: "/calendrier", label: "Calendrier scolaire", icon: CalendarDays },
      { href: "/utilisateurs", label: "Utilisateurs", icon: Users },
    ],
  },
];

export function Sidebar({ user }: { user: { fullName: string; role: string } }) {
  const path = usePathname();
  const router = useRouter();
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col border-r border-[var(--line)] bg-[var(--canvas)] px-4 py-6 lg:flex">
      <div className="px-2">
        <PedagoWordmark />
      </div>
      <nav className="mt-9 flex-1 space-y-7 overflow-y-auto">
        {SECTIONS.filter((s) => !s.admin || user.role === "admin").map((s) => (
          <div key={s.title}>
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">{s.title}</p>
            <ul className="space-y-0.5">
              {s.items.map((it) => {
                const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      className={clsx(
                        "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13.5px] transition-colors",
                        active ? "bg-white font-medium text-ink shadow-[0_0_0_1px_var(--line)]" : "text-ink-2 hover:bg-black/[.035]"
                      )}
                    >
                      <it.icon size={16} className={active ? "text-green" : "text-muted"} />
                      {it.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_0_0_1px_var(--line)]">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-white">
          {user.fullName.slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium">{user.fullName}</p>
          <p className="text-[11.5px] text-muted">{user.role === "admin" ? "Administrateur" : "Relecteur"}</p>
        </div>
        <button
          aria-label="Se déconnecter"
          title="Se déconnecter"
          className="rounded-lg p-1.5 text-muted hover:bg-black/5 hover:text-ink"
          onClick={async () => {
            await fetch("/api/session", { method: "DELETE" });
            router.replace("/connexion");
          }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
