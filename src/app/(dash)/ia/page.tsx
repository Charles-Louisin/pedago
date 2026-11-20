"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RotateCcw, Square } from "lucide-react";
import { api, CLASS_LEVELS, JOB_STATUS, TYPE_LABELS } from "@/lib/api";
import { BubbleButton, BubbleSlider } from "@/components/ui/Bubble";
import { ChromaticOrbButton } from "@/components/ui/ChromaticButton";
import { LiquidOrb } from "@/components/ui/LiquidOrb";
import { Empty, PageHeader, Pill, Select, Skeleton } from "@/components/ui/kit";

type Job = { _id: string; kind: string; status: string; params: Record<string, unknown>; spentUsd: number; budgetUsd: number; currentStep: number; steps: { name: string; status: string; error?: string }[]; lastError?: string; createdAt: string };
type Usage = { model: string; step: string; calls: number; costUsd: number; tokensIn: number; tokensOut: number; cachedTokens: number; avgLatencyMs: number; failures: number };

const KIND_LABELS: Record<string, string> = {
  build_library: "Construire la bibliothèque",
  generate_resource: "Générer une ressource",
  extract_source: "Extraire un programme",
  review_resource: "Relecture IA",
};

export default function AiFactory() {
  const qc = useQueryClient();
  const [classLevel, setClassLevel] = useState("CP");
  const [subjectCode, setSubjectCode] = useState("MATH");
  const [types, setTypes] = useState<string[]>(["lesson_plan", "exercises", "assessment"]);
  const [budget, setBudget] = useState(50);

  const jobs = useQuery({ queryKey: ["jobs"], queryFn: () => api<{ items: Job[] }>("admin/ai/jobs?limit=40"), refetchInterval: 5000 });
  const usage = useQuery({ queryKey: ["usage"], queryFn: () => api<Usage[]>("admin/ai/usage") });
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: () => api<{ code: string; name: string; subsystem: string }[]>("admin/subjects") });
  const subsystem = classLevel.startsWith("CLASS_") ? "anglophone" : "francophone";

  const launch = useMutation({
    mutationFn: () =>
      api("admin/ai/jobs", {
        method: "POST",
        body: { kind: "build_library", params: { classLevel, subjectCode, types, difficulties: ["standard"], perJobBudgetUsd: budget / 100 } },
      }),
    onSuccess: () => {
      toast.success("Production lancée : une tâche par leçon validée et par type");
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "cancel" | "retry" }) => api(`admin/ai/jobs/${id}/${action}`, { method: "POST", body: action === "retry" ? { extraBudgetUsd: 0.5 } : undefined }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const active = jobs.data?.items.filter((j) => j.status === "running" || j.status === "queued").length ?? 0;

  return (
    <>
      <PageHeader eyebrow="Production" title="Usine IA" description="Les ressources sont générées une seule fois, contrôlées par un second modèle puis envoyées en relecture humaine. Rien n'est publié automatiquement." />

      <section className="card relative mb-5 overflow-hidden p-7">
        <div className="flex flex-wrap items-center gap-8">
          <LiquidOrb size={110} state={active ? "thinking" : "idle"} />
          <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select label="Classe" value={classLevel} onChange={(e) => setClassLevel(e.target.value)}>
              {CLASS_LEVELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
            <Select label="Matière" value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)}>
              {subjects.data?.filter((s) => s.subsystem === subsystem).map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </Select>
            <div className="sm:col-span-2">
              <span className="mb-1.5 block text-[12px] font-medium text-muted">Budget maximal par ressource : <b className="text-ink">{(budget / 100).toFixed(2)} $</b></span>
              <BubbleSlider label="Budget par ressource" value={budget} onChange={setBudget} min={5} max={300} step={5} />
            </div>
            <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
              {["lesson_plan", "course_notes", "exercises", "assessment", "remediation"].map((t) => {
                const on = types.includes(t);
                return (
                  <button key={t} onClick={() => setTypes(on ? types.filter((x) => x !== t) : [...types, t])} className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all ${on ? "bubble bubble-green" : "bubble-field text-muted"}`}>
                    {TYPE_LABELS[t]}
                  </button>
                );
              })}
            </div>
            <div className="flex items-end justify-end">
              <ChromaticOrbButton label="Lancer la production" size={56} disabled={!types.length || launch.isPending} onClick={() => launch.mutate()} />
            </div>
          </div>
        </div>
        <p className="mt-5 text-[12.5px] text-muted">Seules les leçons au statut « validée » du référentiel sont utilisées. Une ressource déjà existante n'est jamais régénérée (aucune dépense).</p>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <section>
          <h2 className="mb-3 text-[15px] font-semibold">Tâches</h2>
          {jobs.isLoading ? <Skeleton className="h-64" /> : !jobs.data?.items.length ? <Empty title="Aucune tâche">Lance une production ci-dessus.</Empty> : (
            <ul className="card divide-y divide-[var(--line)]">
              {jobs.data.items.map((j) => (
                <li key={j._id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium">{KIND_LABELS[j.kind]} <span className="text-muted">· {String(j.params.classLevel ?? j.params.type ?? "")}</span></p>
                    <div className="mt-1.5 flex gap-1">
                      {j.steps.map((s) => (
                        <span key={s.name} title={`${s.name} : ${s.status}${s.error ? ` — ${s.error}` : ""}`} className={`h-1.5 flex-1 rounded-full ${s.status === "done" ? "bg-green" : s.status === "running" ? "animate-pulse bg-blue" : s.status === "failed" ? "bg-red" : s.status === "skipped" ? "bg-black/10" : "bg-black/[.07]"}`} />
                      ))}
                    </div>
                    {j.lastError && j.status !== "done" && <p className="mt-1 truncate text-[12px] text-red">{j.lastError}</p>}
                  </div>
                  <span className="w-24 text-right text-[12.5px] tabular-nums text-muted">{j.spentUsd.toFixed(3)} / {j.budgetUsd} $</span>
                  <Pill status={j.status}>{JOB_STATUS[j.status]}</Pill>
                  {["queued", "running"].includes(j.status) && <BubbleButton size="sm" onClick={() => act.mutate({ id: j._id, action: "cancel" })} aria-label="Annuler"><Square size={13} /></BubbleButton>}
                  {["failed", "budget_exceeded", "cancelled"].includes(j.status) && <BubbleButton size="sm" onClick={() => act.mutate({ id: j._id, action: "retry" })} aria-label="Reprendre"><RotateCcw size={13} /></BubbleButton>}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="mb-3 text-[15px] font-semibold">Consommation par modèle</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-[12.5px]">
              <thead className="bg-[var(--surface-2)] text-left text-muted">
                <tr><th className="px-4 py-2.5 font-medium">Modèle / étape</th><th className="px-2 font-medium">Appels</th><th className="px-2 font-medium">Cache</th><th className="px-4 text-right font-medium">Coût</th></tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {usage.data?.length ? usage.data.map((u) => (
                  <tr key={u.model + u.step}>
                    <td className="px-4 py-2.5"><p className="font-medium">{u.model}</p><p className="text-muted">{u.step} · {u.avgLatencyMs} ms{u.failures ? ` · ${u.failures} échec(s)` : ""}</p></td>
                    <td className="px-2 tabular-nums">{u.calls}</td>
                    <td className="px-2 tabular-nums">{u.tokensIn ? Math.round((u.cachedTokens / u.tokensIn) * 100) : 0}%</td>
                    <td className="px-4 text-right font-semibold tabular-nums">{u.costUsd.toFixed(3)} $</td>
                  </tr>
                )) : <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">Aucun appel enregistré.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
