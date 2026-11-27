"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight, Info, RotateCcw, Square } from "lucide-react";
import { api, classLabel, CLASS_LEVELS, JOB_STATUS, SOURCE_STATUS, TYPE_LABELS } from "@/lib/api";
import { BubbleButton, BubbleField } from "@/components/ui/Bubble";
import { Empty, PageHeader, Pill, Segmented, Select, Skeleton } from "@/components/ui/kit";

type Plan = {
  documents: { id: string; title: string; issuer: string; status: string; docType: string; publishedOn: string | null }[];
  sources: { verified: number; toVerify: number };
  subjects: { code: string; name: string; lessons: number; objectives: number; planned: number; existing: number }[];
  missingSubjects: { code: string; name: string }[];
  competencies: { nodes: number; objectives: number; lessons: number };
  resources: { planned: number; launchable: number; existing: number };
  illustrations: { planned: number; reusable: number };
  cost: { avgPerResourceUsd: number | null; estimateUsd: number | null; maxUsd: number; basedOn: number };
  checks: { level: "warn" | "info"; text: string }[];
  methods?: { bySubject: { subjectCode: string; name: string; method: { id: string; title: string } | null }[]; pending: { id: string; title: string }[] };
};
type Job = { _id: string; kind: string; status: string; params: Record<string, unknown>; spentUsd: number; budgetUsd: number; steps: { name: string; status: string }[]; lastError?: string; createdAt: string };

const TYPES = ["lesson_plan", "course_notes", "exercises", "assessment", "remediation"];
const usd = (n: number) => `${n.toFixed(2)} $`;

/**
 * Construire ma bibliothèque (canevas, § 28) : formulaire court, analyse sans dépense,
 * puis lancement pour TOUTE la classe (aucune matière à choisir) et suivi des tâches.
 */
export default function BuildLibrary() {
  const qc = useQueryClient();
  const [subsystem, setSubsystem] = useState<"francophone" | "anglophone">("francophone");
  const levels = CLASS_LEVELS.filter(([v]) => (subsystem === "anglophone" ? v.startsWith("CLASS_") : !v.startsWith("CLASS_")));
  const [classLevel, setClassLevel] = useState("CE1");
  const [source, setSource] = useState<"imported" | "research">("imported");
  const [year, setYear] = useState("2026-2027");
  const [types, setTypes] = useState<string[]>(["lesson_plan", "exercises", "assessment"]);
  const [perJob, setPerJob] = useState(0.5);
  const body = { subsystem, classLevel, source, referenceYear: year || undefined, types, perJobBudgetUsd: perJob };

  const plan = useMutation({
    mutationFn: () => api<Plan>("admin/library/plan", { method: "POST", body }),
    onError: (e: Error) => toast.error(e.message),
  });
  const research = useMutation({
    mutationFn: () => api("admin/ai/jobs", { method: "POST", body: { kind: "research_sources", params: { subsystem, classLevel } } }),
    onSuccess: () => {
      toast.success("Recherche lancée : les documents trouvés arrivent dans Sources, à vérifier");
      qc.invalidateQueries({ queryKey: ["build-jobs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const launch = useMutation({
    mutationFn: () => api("admin/ai/jobs", { method: "POST", body: { kind: "build_library", params: { classLevel, types, difficulties: ["standard"], perJobBudgetUsd: perJob } } }),
    onSuccess: () => {
      toast.success(`Construction lancée pour ${classLabel(classLevel)} : toutes les matières`);
      qc.invalidateQueries({ queryKey: ["build-jobs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const jobs = useQuery({
    queryKey: ["build-jobs"],
    queryFn: () => api<{ items: Job[] }>("admin/ai/jobs?limit=30"),
    refetchInterval: (q) => (q.state.data?.items.some((j) => j.status === "queued" || j.status === "running") ? 4000 : 30000),
  });
  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "cancel" | "retry" }) => api(`admin/ai/jobs/${id}/${action}`, { method: "POST", body: action === "retry" ? { extraBudgetUsd: 0.5 } : undefined }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["build-jobs"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const p = plan.data;
  const counts = (jobs.data?.items ?? []).reduce<Record<string, number>>((m, j) => ((m[j.status] = (m[j.status] ?? 0) + 1), m), {});

  return (
    <>
      <PageHeader eyebrow="Production" title="Construire ma bibliothèque" description="Choisis une classe : l’analyse prépare toutes les matières d’un coup. Rien n’est dépensé avant le lancement, rien n’est publié sans ta relecture." />

      {/* Formulaire court : sous-système, classe, source, année de référence. */}
      <section className="card mb-5 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <span className="mb-1.5 block text-[12px] font-medium text-muted">Sous-système</span>
            <Segmented
              value={subsystem}
              onChange={(v) => {
                setSubsystem(v);
                setClassLevel(v === "anglophone" ? "CLASS_1" : "CE1");
                plan.reset();
              }}
              options={[
                { value: "francophone", label: "Francophone" },
                { value: "anglophone", label: "Anglophone" },
              ]}
            />
          </div>
          <Select label="Classe" value={classLevel} onChange={(e) => { setClassLevel(e.target.value); plan.reset(); }}>
            {levels.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div>
            <span className="mb-1.5 block text-[12px] font-medium text-muted">Source</span>
            <Segmented
              value={source}
              onChange={(v) => { setSource(v); plan.reset(); }}
              options={[
                { value: "imported", label: "Documents importés" },
                { value: "research", label: "Recherche autonome" },
              ]}
            />
          </div>
          <BubbleField label="Année de référence" value={year} onChange={(e) => setYear(e.target.value.slice(0, 9))} placeholder="2026-2027" />
        </div>
        <details className="mt-4 text-[13px]">
          <summary className="cursor-pointer select-none text-muted">Ressources à produire et budget par ressource</summary>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {TYPES.map((t) => {
              const on = types.includes(t);
              return (
                <button key={t} onClick={() => { setTypes(on ? types.filter((x) => x !== t) : [...types, t]); plan.reset(); }} className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all ${on ? "bubble bubble-green" : "bubble-field text-muted"}`}>
                  {TYPE_LABELS[t]}
                </button>
              );
            })}
            <label className="ml-auto flex items-center gap-2 text-muted">
              Plafond par ressource
              <select value={perJob} onChange={(e) => { setPerJob(Number(e.target.value)); plan.reset(); }} className="bubble-field h-9 px-2 text-ink">
                {[0.1, 0.25, 0.5, 1].map((v) => <option key={v} value={v}>{usd(v)}</option>)}
              </select>
            </label>
          </div>
        </details>
        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          {source === "research" && (
            <BubbleButton disabled={research.isPending} onClick={() => research.mutate()}>Lancer la recherche de sources</BubbleButton>
          )}
          <BubbleButton tone="green" disabled={!types.length || plan.isPending} onClick={() => plan.mutate()}>
            {plan.isPending ? "Analyse…" : "Analyser et préparer ma bibliothèque complète"}
          </BubbleButton>
        </div>
      </section>

      {plan.isPending && <Skeleton className="mb-5 h-72" />}
      {p && (
        <section className="mb-8 rise-in">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Fact label="Documents trouvés" value={p.documents.length} hint="cités par le programme de la classe" />
            <Fact label="Sources officielles" value={p.sources.verified} hint={`${p.sources.toVerify} à vérifier`} />
            <Fact label="Matières détectées" value={p.subjects.length} hint={p.missingSubjects.length ? `${p.missingSubjects.length} sans leçon` : "toutes couvertes"} />
            <Fact label="Compétences extraites" value={p.competencies.objectives} hint={`${p.competencies.lessons} leçons validées`} />
            <Fact label="Ressources prévues" value={p.resources.planned} hint={`${p.resources.existing} déjà prêtes (non refaites)`} />
            <Fact label="Illustrations prévues" value={p.illustrations.planned} hint={`${p.illustrations.reusable} réutilisables`} />
            <Fact label="Estimation des coûts" value={p.cost.estimateUsd === null ? "—" : usd(p.cost.estimateUsd)} hint={`plafond ${usd(p.cost.maxUsd)}${p.cost.basedOn ? ` · moyenne de ${p.cost.basedOn} générations` : ""}`} />
            <Fact label="Points à vérifier" value={p.checks.filter((c) => c.level === "warn").length} hint="détail ci-dessous" />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="card min-w-0 overflow-hidden">
              <h2 className="px-5 pt-4 text-[14px] font-semibold">Par matière</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-[13px]">
                  <thead className="text-left text-muted">
                    <tr><th className="px-5 py-2 font-medium">Matière</th><th className="px-2 font-medium">Méthode</th><th className="px-2 font-medium">Leçons</th><th className="px-2 font-medium">Prévues</th><th className="px-5 text-right font-medium">Prêtes</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)]">
                    {p.subjects.map((s) => (
                      <tr key={s.code}>
                        <td className="px-5 py-2.5 font-medium"><Link className="hover:underline" href={`/dashboard/ressources?classLevel=${classLevel}&subjectCode=${s.code}&status=ALL`}>{s.name}</Link></td>
                        <td className="max-w-[180px] truncate px-2 text-muted" title={p.methods?.bySubject.find((x) => x.subjectCode === s.code)?.method?.title ?? "Démarche générique"}>
                          {p.methods?.bySubject.find((x) => x.subjectCode === s.code)?.method ? (
                            <Link className="text-ink hover:underline" href="/dashboard/methodes?status=validated">{p.methods.bySubject.find((x) => x.subjectCode === s.code)!.method!.title}</Link>
                          ) : (
                            "Générique"
                          )}
                        </td>
                        <td className="px-2 tabular-nums">{s.lessons}</td>
                        <td className="px-2 tabular-nums">{s.planned}</td>
                        <td className="px-5 text-right tabular-nums">{s.existing}</td>
                      </tr>
                    ))}
                    {!p.subjects.length && <tr><td colSpan={5} className="px-5 py-6 text-center text-muted">Aucune leçon validée.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-5">
              <div className="card p-5">
                <h2 className="mb-3 text-[14px] font-semibold">Points nécessitant une vérification</h2>
                <ul className="space-y-2.5">
                  {p.checks.map((c, i) => (
                    <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed">
                      {c.level === "warn" ? <AlertTriangle size={16} className="mt-0.5 shrink-0 text-sun" /> : <Info size={16} className="mt-0.5 shrink-0 text-muted" />}
                      <span className="min-w-0">{c.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {p.documents.length > 0 && (
                <div className="card p-5">
                  <h2 className="mb-3 text-[14px] font-semibold">Documents</h2>
                  <ul className="space-y-2">
                    {p.documents.map((d) => (
                      <li key={d.id} className="flex items-center gap-3 text-[13px]">
                        <span className="min-w-0 flex-1 truncate" title={d.title}>{d.title} <span className="text-muted">· {d.issuer}</span></span>
                        <Pill status={d.status === "verified" ? "validated" : "extracted"}>{SOURCE_STATUS[d.status] ?? d.status}</Pill>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="card mt-5 flex flex-wrap items-center gap-4 p-5">
            <p className="min-w-0 flex-1 text-[13.5px] text-muted">
              {p.resources.launchable ? (
                <>
                  <b className="text-ink">{p.resources.launchable} ressource(s)</b> seront générées pour {classLabel(classLevel)}, toutes matières confondues, puis contrôlées par un second modèle et mises en relecture.
                </>
              ) : (
                "Rien à générer : tout existe déjà ou aucune leçon n’est validée."
              )}
            </p>
            <BubbleButton tone="green" disabled={!p.resources.launchable || launch.isPending || (p.methods?.pending.length ?? 0) > 0} onClick={() => launch.mutate()}>
              Lancer la construction <ArrowRight size={16} />
            </BubbleButton>
          </div>
        </section>
      )}

      {/* Tableau de bord de suivi des tâches. */}
      <section>
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 className="text-[15px] font-semibold">Suivi des tâches</h2>
          <span className="text-[12.5px] text-muted">
            {Object.entries(counts).map(([k, n]) => `${n} ${JOB_STATUS[k]?.toLowerCase() ?? k}`).join(" · ") || "—"}
          </span>
          <Link href="/dashboard/ressources?status=HUMAN_REVIEW" className="ml-auto text-[13px] font-medium hover:underline">Relire et valider par lot →</Link>
        </div>
        {jobs.isLoading ? (
          <Skeleton className="h-48" />
        ) : !jobs.data?.items.length ? (
          <Empty title="Aucune tâche">Analyse une classe puis lance la construction.</Empty>
        ) : (
          <ul className="card divide-y divide-[var(--line)]">
            {jobs.data.items.map((j) => (
              <li key={j._id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                <div className="min-w-0 flex-1 basis-60">
                  <p className="truncate text-[14px] font-medium">
                    {j.kind === "build_library" ? "Bibliothèque complète" : j.kind === "research_sources" ? "Recherche de sources" : TYPE_LABELS[String(j.params.type)] ?? j.kind}
                    <span className="text-muted"> · {j.params.classLevel ? classLabel(String(j.params.classLevel)) : String(j.params.difficulty ?? "")}</span>
                  </p>
                  <div className="mt-1.5 flex gap-1">
                    {j.steps.map((s) => (
                      <span key={s.name} title={`${s.name} : ${s.status}`} className={`h-1.5 flex-1 rounded-full ${s.status === "done" ? "bg-green" : s.status === "running" ? "animate-pulse bg-blue" : s.status === "failed" ? "bg-red" : "bg-ink/[.07]"}`} />
                    ))}
                  </div>
                  {j.lastError && j.status !== "done" && <p className="mt-1 truncate text-[12px] text-red">{j.lastError}</p>}
                </div>
                <span className="text-[12.5px] tabular-nums text-muted">{j.spentUsd.toFixed(3)} / {j.budgetUsd} $</span>
                <Pill status={j.status}>{JOB_STATUS[j.status]}</Pill>
                {["queued", "running"].includes(j.status) && <BubbleButton size="sm" onClick={() => act.mutate({ id: j._id, action: "cancel" })} aria-label="Annuler"><Square size={13} /></BubbleButton>}
                {["failed", "budget_exceeded", "cancelled"].includes(j.status) && <BubbleButton size="sm" onClick={() => act.mutate({ id: j._id, action: "retry" })} aria-label="Reprendre"><RotateCcw size={13} /></BubbleButton>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Fact({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="card min-w-0 p-4">
      <p className="truncate text-[12px] font-medium text-muted">{label}</p>
      <p className="mt-1.5 text-[24px] font-semibold tabular-nums tracking-[-0.02em]">{value}</p>
      {hint && <p className="mt-0.5 truncate text-[11.5px] text-faint" title={hint}>{hint}</p>}
    </div>
  );
}
