"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader, Skeleton } from "@/components/ui/kit";

type Cal = { schoolYear: string; startsOn: string; endsOn: string; verified: boolean; terms: { number: number; startsOn: string; endsOn: string }[]; breaks: { label: string; startsOn: string; endsOn: string; kind: string }[] };

const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export default function CalendarPage() {
  const { data, isLoading } = useQuery({ queryKey: ["calendars"], queryFn: () => api<Cal[]>("admin/calendars") });
  return (
    <>
      <PageHeader eyebrow="Administration" title="Calendrier scolaire" description="Utilisé par le moteur de planification pour sauter congés, vacances et examens. Version par année scolaire." />
      {isLoading ? <Skeleton className="h-80" /> : data?.map((c) => (
        <section key={c.schoolYear} className="card mb-5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[20px] font-semibold">{c.schoolYear}</h2>
            {!c.verified && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff6db] px-3 py-1 text-[12px] font-semibold text-[#8a6400]">
                <AlertTriangle size={13} /> À vérifier contre l’arrêté officiel
              </span>
            )}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {c.terms.map((t) => (
              <div key={t.number} className="rounded-2xl bg-[var(--surface-2)] p-4 shadow-[0_0_0_1px_var(--line)]">
                <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">Trimestre {t.number}</p>
                <p className="mt-1 text-[14px] font-medium">{fmt(t.startsOn)} → {fmt(t.endsOn)}</p>
              </div>
            ))}
          </div>
          <ul className="mt-5 divide-y divide-[var(--line)]">
            {c.breaks.map((b) => (
              <li key={b.label + b.startsOn} className="flex justify-between py-2.5 text-[13.5px]">
                <span>{b.label}</span>
                <span className="text-muted">{b.startsOn === b.endsOn ? fmt(b.startsOn) : `${fmt(b.startsOn)} → ${fmt(b.endsOn)}`}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
