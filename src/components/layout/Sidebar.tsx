"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpenCheck, CalendarDays, FileSearch, GitBranch, LayoutGrid, LogOut, Menu, Sparkles, Users, X } from "lucide-react";
import { clsx } from "clsx";
import { PedagoWordmark } from "@/components/brand/PedagoMark";
import { ThemeToggle } from "./ThemeToggle";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

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

type User = { fullName: string; role: string };

function NavContent({ user, onNavigate }: { user: User; onNavigate?: () => void }) {
  const path = usePathname();
  const router = useRouter();
  const [confirmOut, setConfirmOut] = useState(false);
  const [leaving, setLeaving] = useState(false);
  return (
    <>
      <nav className="mt-9 flex-1 space-y-7 overflow-y-auto" aria-label="Navigation principale">
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
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={clsx(
                        "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13.5px] transition-colors",
                        active ? "bg-surface font-medium text-ink shadow-[0_0_0_1px_var(--line)]" : "text-ink-2 hover:bg-ink/[.035]"
                      )}
                    >
                      <it.icon size={16} className={active ? "text-green" : "text-muted"} aria-hidden />
                      {it.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <ThemeToggle />
      <div className="mt-2 flex items-center gap-3 rounded-lg bg-surface p-3 border border-[var(--line)]">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-[13px] font-semibold text-[var(--on-accent)]" aria-hidden>
          {user.fullName.slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium">{user.fullName}</p>
          <p className="text-[11.5px] text-muted">{user.role === "admin" ? "Administrateur" : "Relecteur"}</p>
        </div>
        <button
          aria-label="Se déconnecter"
          title="Se déconnecter"
          className="rounded-lg p-1.5 text-muted hover:bg-ink/5 hover:text-ink"
          onClick={() => setConfirmOut(true)}
        >
          <LogOut size={16} />
        </button>
      </div>
      <ConfirmDialog
        open={confirmOut}
        title="Se déconnecter ?"
        message="Tu devras saisir ton mot de passe et ton code de double authentification pour revenir."
        confirmLabel={leaving ? "Déconnexion…" : "Se déconnecter"}
        busy={leaving}
        onCancel={() => setConfirmOut(false)}
        onConfirm={async () => {
          setLeaving(true);
          await fetch("/api/session", { method: "DELETE" });
          router.replace("/connexion");
        }}
      />
    </>
  );
}

export function Sidebar({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Bureau */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-[var(--line)] bg-[var(--canvas)] px-4 py-6 lg:flex">
        <div className="px-2">
          <PedagoWordmark />
        </div>
        <NavContent user={user} />
      </aside>

      {/* Mobile / tablette : barre supérieure + tiroir */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--line)] bg-[var(--canvas)]/90 px-4 py-3 backdrop-blur lg:hidden">
        <PedagoWordmark />
        <button aria-label="Ouvrir le menu" aria-expanded={open} onClick={() => setOpen(true)} className="bubble inline-flex h-10 w-10 items-center justify-center">
          <Menu size={18} />
        </button>
      </header>
      <div className={clsx("fixed inset-0 z-40 lg:hidden", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
        <div className={clsx("absolute inset-0 bg-ink/25 transition-opacity duration-300", open ? "opacity-100" : "opacity-0")} onClick={() => setOpen(false)} />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className={clsx(
            "absolute inset-y-0 left-0 flex w-[min(86vw,300px)] flex-col bg-[var(--canvas)] px-4 py-5 shadow-2xl transition-transform duration-300 [transition-timing-function:var(--ease-out)]",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center justify-between px-2">
            <PedagoWordmark />
            <button aria-label="Fermer le menu" onClick={() => setOpen(false)} className="rounded-lg p-2 text-muted hover:bg-ink/5">
              <X size={18} />
            </button>
          </div>
          <NavContent user={user} onNavigate={() => setOpen(false)} />
        </div>
      </div>
    </>
  );
}
