"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader, Skeleton, Stat, StatusIcon } from "@/components/ui/kit";

type Stats = {
  resources: Record<string, number>;
  teachers: number;
  nodes: Record<string, number>;
  sources: number;
  jobs: Record<string, number>;
  costByDay: { day: string; costUsd: number; calls: number }[];
  aiConfigured: boolean;
};

export default function Overview() {
  const { data, isLoading } = useQuery({ queryKey: ["stats"], queryFn: () => api<Stats>("admin/stats"), refetchInterval: 30_000, refetchIntervalInBackground: false });
  const running = (data?.jobs.running ?? 0) + (data?.jobs.queued ?? 0);
  const toReview = data?.resources.HUMAN_REVIEW ?? 0;
  const maxCost = Math.max(0.0001, ...(data?.costByDay.map((c) => c.costUsd) ?? [0]));
  const totalCost = data?.costByDay.reduce((s, c) => s + c.costUsd, 0) ?? 0;

  return (
    <>
      <PageHeader eyebrow="Vue d'ensemble" title="Bonjour" description="L'état de la bibliothèque, des relectures et de la production IA." />

      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <section className="card relative flex flex-col items-start gap-6 overflow-hidden p-6 sm:flex-row sm:items-center sm:gap-7 sm:p-7 rise-in">
          <StatusIcon size={64} state={!data?.aiConfigured ? "error" : running ? "busy" : toReview ? "warn" : "idle"} />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted">Usine IA</p>
            <h2 className="mt-1 text-[24px] font-semibold leading-tight">
              {!data ? "…" : !data.aiConfigured ? "Clé OpenRouter manquante" : running ? `${running} tâche(s) en cours` : "En attente"}
            </h2>
            <p className="mt-1.5 text-[14px] text-muted">
              {toReview ? `${toReview} ressource(s) attendent une validation humaine.` : "Aucune ressource n'attend de relecture."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/ressources?status=HUMAN_REVIEW" className="bubble inline-flex h-10 items-center gap-1.5 px-4 text-[13px] font-semibold">
                Relire <ArrowUpRight size={15} />
              </Link>
              <Link href="/ia" className="bubble bubble-ink inline-flex h-10 items-center gap-1.5 px-4 text-[13px] font-semibold">
                Lancer une production
              </Link>
            </div>
          </div>
        </section>

        <section className="card p-6 rise-in" style={{ animationDelay: "80ms" }}>
          <div className="flex items-baseline justify-between">
            <p className="text-[13px] font-semibold">Dépenses IA (30 j)</p>
            <p className="text-[22px] font-semibold tracking-[-0.03em]">{totalCost.toFixed(2)} $</p>
          </div>
          <div className="mt-6 flex h-28 items-end gap-[3px]">
            {(data?.costByDay.length ? data.costByDay : Array.from({ length: 30 }, (_, i) => ({ day: String(i), costUsd: 0, calls: 0 }))).map((c) => (
              <div key={c.day} title={`${c.day} · ${c.costUsd} $ · ${c.calls} appels`} className="flex-1 rounded-t-[4px] bg-accent/70 transition-all hover:bg-green" style={{ height: `${Math.max(3, (c.costUsd / maxCost) * 100)}%` }} />
            ))}
          </div>
        </section>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading || !data ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[118px]" />)
        ) : (
          <>
            <Stat label="Ressources publiées" value={data.resources.PUBLISHED ?? 0} hint="visibles par les enseignants" accent="var(--green)" />
            <Stat label="À relire" value={toReview} hint="validation humaine requise" accent={toReview ? "var(--sun)" : undefined} />
            <Stat label="Leçons du référentiel" value={(data.nodes.validated ?? 0) + (data.nodes.extracted ?? 0)} hint={`${data.nodes.extracted ?? 0} à valider`} />
            <Stat label="Enseignants" value={data.teachers} hint={`${data.sources} source(s) officielle(s)`} />
          </>
        )}
      </div>
    </>
  );
}
