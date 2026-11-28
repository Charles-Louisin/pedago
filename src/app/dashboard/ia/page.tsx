"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, RotateCcw, Square } from "lucide-react";
import { api, classLabel, JOB_STATUS, TYPE_LABELS } from "@/lib/api";
import { BubbleButton } from "@/components/ui/Bubble";
import { Empty, PageHeader, Pill, Skeleton, StatusIcon } from "@/components/ui/kit";

type Job = {
  _id: string;
  kind: string;
  status: string;
  params: Record<string, unknown>;
  spentUsd: number;
  budgetUsd: number;
  currentStep: number;
  steps: { name: string; status: string; error?: string }[];
  lastError?: string;
  createdAt: string;
};
type Usage = { model: string; step: string; calls: number; costUsd: number; tokensIn: number; tokensOut: number; cachedTokens: number; avgLatencyMs: number; failures: number };

const KIND_LABELS: Record<string, string> = {
  ingest_curriculum: "Analyse d'un programme",
  analyze_method: "Analyse d'une méthode de préparation",
  build_library: "Construction de la bibliothèque",
  generate_resource: "Rédaction d'une ressource",
  extract_source: "Extraction (ancienne méthode)",
  review_resource: "Relecture IA",
  research_sources: "Recherche de sources",
  teacher_import: "Import d'une fiche (enseignant)",
  program_import: "Import d'un programme (enseignant)",
  teacher_illustration: "Illustration (enseignant)",
};

/**
 * Suivi des tâches IA : tout ce que l'IA fait ou a fait (analyses de programmes, de méthodes, rédaction
 * des ressources), son avancement, ses erreurs et son coût. Les lancements se font là où se trouve la
 * donnée : Sources (analyse d'un programme ou d'une méthode) et Construire ma bibliothèque (ressources).
 */
export default function AiTasks() {
  const qc = useQueryClient();
  // Actualisation rapide seulement quand des tâches tournent.
  const jobs = useQuery({
    queryKey: ["jobs"],
    queryFn: () => api<{ items: Job[] }>("admin/ai/jobs?limit=50"),
    refetchInterval: (q) => (q.state.data?.items.some((j) => j.status === "queued" || j.status === "running") ? 4000 : 30000),
  });
  const stats = useQuery({ queryKey: ["stats"], queryFn: () => api<{ aiConfigured: boolean }>("admin/stats") });
  const aiReady = stats.data?.aiConfigured ?? false;
  const usage = useQuery({ queryKey: ["usage"], queryFn: () => api<Usage[]>("admin/ai/usage") });
  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "cancel" | "retry" }) => api(`admin/ai/jobs/${id}/${action}`, { method: "POST", body: action === "retry" ? { extraBudgetUsd: 0.5 } : undefined }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const items = jobs.data?.items ?? [];
  const active = items.filter((j) => j.status === "running" || j.status === "queued").length;
  const spent = (usage.data ?? []).reduce((n, u) => n + u.costUsd, 0);
  const detail = (j: Job) => {
    if (j.kind === "ingest_curriculum") {
      const chunks = j.steps.filter((s) => s.name === "ingest_chunk");
      return chunks.length ? `${chunks.filter((s) => s.status === "done").length} / ${chunks.length} parties` : "lecture du document";
    }
    if (j.params.classLevel) return classLabel(String(j.params.classLevel));
    return TYPE_LABELS[String(j.params.type)] ?? "";
  };

  return (
    <>
      <PageHeader
        eyebrow="Production"
        title="Suivi des tâches IA"
        description="Tout ce que l'IA fait pour le tableau de bord : analyse des programmes et des méthodes, rédaction des ressources. Rien n'est publié sans ta validation."
      />

      <section className="card mb-5 flex flex-wrap items-center gap-6 p-6">
        <StatusIcon size={56} state={!aiReady ? "error" : active ? "busy" : "idle"} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">{!aiReady ? "IA non configurée" : active ? `${active} tâche${active > 1 ? "s" : ""} en cours` : "Aucune tâche en cours"}</p>
          <p className="text-[13px] text-muted">
            {!aiReady ? (
              <>Renseigne <code>OPENROUTER_API_KEY</code> dans la configuration de l’API.</>
            ) : (
              <>Dépense totale enregistrée : <b className="text-ink">{spent.toFixed(3)} $</b></>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/sources" className="bubble inline-flex h-10 items-center gap-1.5 px-4 text-[13.5px] font-semibold">Sources <ArrowRight size={14} /></Link>
          <Link href="/dashboard/bibliotheque" className="bubble bubble-green inline-flex h-10 items-center gap-1.5 px-4 text-[13.5px] font-semibold">Construire ma bibliothèque <ArrowRight size={14} /></Link>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="min-w-0">
          <h2 className="mb-3 text-[15px] font-semibold">Tâches</h2>
          {jobs.isLoading ? (
            <Skeleton className="h-64" />
          ) : !items.length ? (
            <Empty title="Aucune tâche">Marque un programme « Vérifiée » dans Sources pour lancer son analyse.</Empty>
          ) : (
            <ul className="card divide-y divide-[var(--line)]">
              {items.map((j) => (
                <li key={j._id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="text-[14px] font-medium">
                      {KIND_LABELS[j.kind] ?? j.kind} <span className="text-muted">· {detail(j)} · {new Date(j.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span>
                    </p>
                    <div className="mt-1.5 flex gap-1">
                      {j.steps.map((s, i) => (
                        <span
                          key={`${s.name}-${i}`}
                          title={`${s.name} : ${s.status}${s.error ? ` — ${s.error}` : ""}`}
                          className={`h-1.5 flex-1 rounded-full ${s.status === "done" ? "bg-green" : s.status === "running" ? "animate-pulse bg-blue" : s.status === "failed" ? "bg-red" : s.status === "skipped" ? "bg-ink/10" : "bg-ink/[.07]"}`}
                        />
                      ))}
                    </div>
                    {j.lastError && j.status !== "done" && <p className="mt-1 truncate text-[12px] text-red" title={j.lastError}>{j.lastError}</p>}
                  </div>
                  <span className="text-right text-[12.5px] tabular-nums text-muted">{j.spentUsd.toFixed(3)} / {j.budgetUsd} $</span>
                  <Pill status={j.status}>{JOB_STATUS[j.status]}</Pill>
                  {["queued", "running"].includes(j.status) && <BubbleButton size="sm" onClick={() => act.mutate({ id: j._id, action: "cancel" })} aria-label="Annuler"><Square size={13} /></BubbleButton>}
                  {["failed", "budget_exceeded", "cancelled"].includes(j.status) && <BubbleButton size="sm" onClick={() => act.mutate({ id: j._id, action: "retry" })} aria-label="Reprendre"><RotateCcw size={13} /></BubbleButton>}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="min-w-0">
          <h2 className="mb-3 text-[15px] font-semibold">Consommation par modèle</h2>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[360px] text-[12.5px]">
              <thead className="bg-[var(--surface-2)] text-left text-muted">
                <tr><th className="px-4 py-2.5 font-medium">Modèle / étape</th><th className="px-2 font-medium">Appels</th><th className="px-2 font-medium">Cache</th><th className="px-4 text-right font-medium">Coût</th></tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {usage.data?.length ? (
                  usage.data.map((u) => (
                    <tr key={u.model + u.step}>
                      <td className="max-w-[220px] px-4 py-2.5"><p className="break-all font-medium">{u.model}</p><p className="text-muted">{u.step} · {u.avgLatencyMs} ms{u.failures ? ` · ${u.failures} échec(s)` : ""}</p></td>
                      <td className="px-2 tabular-nums">{u.calls}</td>
                      <td className="px-2 tabular-nums">{u.tokensIn ? Math.round((u.cachedTokens / u.tokensIn) * 100) : 0}%</td>
                      <td className="px-4 text-right font-semibold tabular-nums">{u.costUsd.toFixed(3)} $</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">Aucun appel enregistré.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
