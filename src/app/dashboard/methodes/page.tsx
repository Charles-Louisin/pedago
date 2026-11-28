"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Archive, Check, ChevronDown, Pencil, Plus, Trash2, X } from "lucide-react";
import { api, classLabel, CLASS_LEVELS, TYPE_LABELS } from "@/lib/api";
import { BubbleButton, BubbleField } from "@/components/ui/Bubble";
import { Empty, PageHeader, Pill, Segmented, Skeleton } from "@/components/ui/kit";

type Step = { name: string; purpose?: string; durationMin?: number | null; teacherRole?: string; learnerRole?: string };
type Method = {
  _id: string;
  title: string;
  subsystem: "francophone" | "anglophone";
  classLevels: string[];
  subjectCodes: string[];
  resourceTypes: string[];
  layout: { header?: { label: string; field: string }[]; sections?: { key: string; label: string }[]; stepColumns?: { key: string; label: string }[] };
  sectionGuidance: { label: string; guidance?: string }[];
  steps: Step[];
  extraSections: { label: string; guidance?: string }[];
  conventions: string[];
  pages: number[];
  warnings: string[];
  status: "extracted" | "validated" | "retired";
  version: number;
  validatedAt?: string;
  sourceId?: { _id: string; title: string; issuer: string; docType: string } | null;
};

const STATUS: Record<Method["status"], string> = { extracted: "À valider", validated: "Validée", retired: "Retirée" };
const TYPES = ["lesson_plan", "course_notes", "exercises", "assessment", "composition", "exam", "grading_rubric", "remediation"];

/**
 * Méthodes de préparation : ce que l'IA a relevé dans un guide pédagogique ou une fiche modèle (Sources).
 * Rien n'est suivi tant qu'un humain n'a pas relu et validé la méthode ; la génération des leçons
 * (Construire ma bibliothèque) applique ensuite la méthode validée la plus précise.
 */
export default function Methodes() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"extracted" | "validated" | "all">("extracted");
  const [open, setOpen] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["methods", filter],
    queryFn: () => api<{ items: Method[] }>(`admin/methods${filter === "all" ? "" : `?status=${filter}`}`),
    // Une analyse en cours dépose ses méthodes en arrière-plan.
    refetchInterval: 15_000,
  });
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: () => api<{ code: string; name: string; subsystem: string }[]>("admin/subjects") });
  const refresh = () => qc.invalidateQueries({ queryKey: ["methods"] });
  const onError = (e: Error) => toast.error(e.message);

  const validate = useMutation({
    mutationFn: (id: string) => api<{ replaced: number }>(`admin/methods/${id}/validate`, { method: "POST" }),
    onSuccess: (r) => {
      toast.success(r.replaced ? "Méthode validée : elle remplace l'ancienne de même portée" : "Méthode validée : la génération la suivra");
      refresh();
    },
    onError,
  });
  const retire = useMutation({
    mutationFn: (id: string) => api(`admin/methods/${id}/retire`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Méthode retirée");
      refresh();
    },
    onError,
  });

  const items = data?.items ?? [];
  return (
    <>
      <PageHeader
        eyebrow="Bibliothèque"
        title="Méthodes de préparation"
        description="La démarche officielle relevée dans tes guides pédagogiques et fiches modèles. Relis-la, corrige-la si besoin, puis valide-la : la génération des fiches la suit (rubriques, intitulés, étapes, règles)."
      />
      <div className="mb-3 flex items-center justify-between gap-3">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "extracted", label: "À valider" },
            { value: "validated", label: "Validées" },
            { value: "all", label: "Toutes" },
          ]}
        />
        <span className="text-[12.5px] text-muted">{items.length} méthode{items.length > 1 ? "s" : ""}</span>
      </div>

      {isLoading ? (
        <Skeleton className="h-72" />
      ) : !items.length ? (
        <Empty title={filter === "extracted" ? "Rien à valider" : "Aucune méthode"}>
          Dépose un guide pédagogique ou une fiche modèle dans{" "}
          <Link href="/dashboard/sources" className="font-medium text-ink underline-offset-2 hover:underline">Sources</Link>, puis lance « Analyser la méthode ».
        </Empty>
      ) : (
        <ul className="grid gap-3">
          {items.map((m) => (
            <li key={m._id} className="card">
              <button type="button" onClick={() => setOpen(open === m._id ? null : m._id)} className="flex w-full flex-wrap items-center gap-3 px-5 py-4 text-left" aria-expanded={open === m._id}>
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-medium">{m.title}</p>
                  <p className="text-[12.5px] text-muted">
                    {m.subsystem === "anglophone" ? "Anglophone" : "Francophone"} · {scope(m, subjects.data)} · {m.steps.length} étape{m.steps.length > 1 ? "s" : ""} · version {m.version}
                    {m.sourceId ? ` · ${m.sourceId.title}` : ""}
                  </p>
                </div>
                {m.warnings.length > 0 && m.status === "extracted" && (
                  <span className="inline-flex items-center gap-1 text-[12px] font-medium text-amber-700 dark:text-amber-400"><AlertTriangle size={14} /> {m.warnings.length} point{m.warnings.length > 1 ? "s" : ""} à vérifier</span>
                )}
                <Pill status={m.status}>{STATUS[m.status]}</Pill>
                <ChevronDown size={16} className={`text-muted transition-transform ${open === m._id ? "rotate-180" : ""}`} />
              </button>
              {open === m._id && (
                <MethodDetail
                  m={m}
                  subjects={(subjects.data ?? []).filter((s) => s.subsystem === m.subsystem)}
                  onValidate={() => validate.mutate(m._id)}
                  onRetire={() => retire.mutate(m._id)}
                  busy={validate.isPending || retire.isPending}
                  onSaved={refresh}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function scope(m: Method, subjects?: { code: string; name: string }[]) {
  const classes = m.classLevels.length ? m.classLevels.map(classLabel).join(", ") : "toutes les classes";
  const names = new Map((subjects ?? []).map((s) => [s.code, s.name]));
  const subs = m.subjectCodes.length ? m.subjectCodes.map((c) => names.get(c) ?? c).join(", ") : "toutes les matières";
  return `${classes} · ${subs}`;
}

function MethodDetail({
  m,
  subjects,
  onValidate,
  onRetire,
  busy,
  onSaved,
}: {
  m: Method;
  subjects: { code: string; name: string }[];
  onValidate: () => void;
  onRetire: () => void;
  busy: boolean;
  onSaved: () => void;
}) {
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState(() => ({
    title: m.title,
    classLevels: m.classLevels,
    subjectCodes: m.subjectCodes,
    resourceTypes: m.resourceTypes,
    sections: m.layout.sections ?? [],
    guidance: Object.fromEntries(m.sectionGuidance.map((g) => [g.label, g.guidance ?? ""])) as Record<string, string>,
    steps: m.steps,
    conventions: m.conventions.join("\n"),
  }));
  const save = useMutation({
    mutationFn: () =>
      api(`admin/methods/${m._id}`, {
        method: "PATCH",
        body: {
          title: draft.title,
          classLevels: draft.classLevels,
          subjectCodes: draft.subjectCodes,
          resourceTypes: draft.resourceTypes,
          layout: { ...m.layout, sections: draft.sections },
          sectionGuidance: draft.sections.map((s) => ({ label: s.label, guidance: draft.guidance[s.label] ?? "" })).filter((g) => g.guidance),
          extraSections: draft.sections.filter((s) => s.key === "extra").map((s) => ({ label: s.label, guidance: draft.guidance[s.label] || undefined })),
          steps: draft.steps.filter((s) => s.name.trim().length >= 2).map((s) => ({ ...s, durationMin: s.durationMin || null })),
          conventions: draft.conventions.split("\n").map((c) => c.trim()).filter((c) => c.length >= 2),
        },
      }),
    onSuccess: () => {
      toast.success(m.status === "validated" ? "Méthode corrigée : elle repasse « à valider »" : "Méthode corrigée");
      setEdit(false);
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const guidance = new Map(m.sectionGuidance.map((g) => [g.label, g.guidance]));
  const classes = CLASS_LEVELS.filter(([v]) => (m.subsystem === "anglophone" ? v.startsWith("CLASS_") : !v.startsWith("CLASS_")));

  return (
    <div className="grid gap-5 border-t border-[var(--line)] px-5 pb-5 pt-4">
      {m.warnings.length > 0 && (
        <div className="rounded-2xl bg-amber-500/10 p-4 text-[13px] text-amber-900 dark:text-amber-200">
          <p className="mb-1 font-semibold">À vérifier avant de valider</p>
          <ul className="list-disc pl-5">{m.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        </div>
      )}

      {!edit ? (
        <>
          <Block title="Portée">
            <p className="text-[13.5px]">{scope(m, subjects)}</p>
            <p className="text-[12.5px] text-muted">Documents : {m.resourceTypes.map((t) => TYPE_LABELS[t] ?? t).join(", ")}{m.pages.length ? ` · pages ${m.pages.join(", ")} du document` : ""}</p>
          </Block>
          {m.layout.header?.length ? (
            <Block title="Cartouche">
              <div className="flex flex-wrap gap-2">{m.layout.header.map((h) => <span key={h.label} className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-[12.5px] shadow-[0_0_0_1px_var(--line)]">{h.label}</span>)}</div>
            </Block>
          ) : null}
          <Block title="Rubriques de la fiche, dans l'ordre">
            <ol className="grid gap-1.5">
              {(m.layout.sections ?? []).map((s, i) => (
                <li key={`${s.label}-${i}`} className="text-[13.5px]">
                  <span className="font-medium">{i + 1}. {s.label}</span>
                  {guidance.get(s.label) && <span className="text-muted"> — {guidance.get(s.label)}</span>}
                </li>
              ))}
            </ol>
          </Block>
          {m.steps.length > 0 && (
            <Block title="Démarche (étapes du déroulement)">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-[13px]">
                  <thead className="text-[12px] text-muted">
                    <tr><th className="py-1.5 pr-3 font-medium">Étape</th><th className="py-1.5 pr-3 font-medium">Durée</th><th className="py-1.5 pr-3 font-medium">But</th><th className="py-1.5 pr-3 font-medium">Enseignant</th><th className="py-1.5 font-medium">Apprenants</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)]">
                    {m.steps.map((s, i) => (
                      <tr key={`${s.name}-${i}`} className="align-top">
                        <td className="py-2 pr-3 font-medium">{i + 1}. {s.name}</td>
                        <td className="py-2 pr-3 tabular-nums">{s.durationMin ? `${s.durationMin} min` : "—"}</td>
                        <td className="py-2 pr-3">{s.purpose || "—"}</td>
                        <td className="py-2 pr-3">{s.teacherRole || "—"}</td>
                        <td className="py-2">{s.learnerRole || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Block>
          )}
          {m.conventions.length > 0 && (
            <Block title="Règles de rédaction">
              <ul className="list-disc pl-5 text-[13.5px]">{m.conventions.map((c) => <li key={c}>{c}</li>)}</ul>
            </Block>
          )}
          <div className="flex flex-wrap gap-2">
            {m.status === "extracted" && <BubbleButton tone="green" onClick={onValidate} disabled={busy}><Check size={15} /> Valider la méthode</BubbleButton>}
            {m.status !== "retired" && <BubbleButton onClick={() => setEdit(true)}><Pencil size={15} /> Corriger</BubbleButton>}
            {m.status !== "retired" && <BubbleButton onClick={onRetire} disabled={busy}><Archive size={15} /> Retirer</BubbleButton>}
          </div>
        </>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="grid gap-5">
          <BubbleField label="Intitulé" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <Block title="Classes (aucune cochée = toutes)">
            <div className="flex flex-wrap gap-2">
              {classes.map(([v, l]) => (
                <Chip key={v} on={draft.classLevels.includes(v)} onClick={() => setDraft({ ...draft, classLevels: toggle(draft.classLevels, v) })}>{l}</Chip>
              ))}
            </div>
          </Block>
          <Block title="Matières (aucune cochée = toutes)">
            <div className="flex flex-wrap gap-2">
              {subjects.map((s) => (
                <Chip key={s.code} on={draft.subjectCodes.includes(s.code)} onClick={() => setDraft({ ...draft, subjectCodes: toggle(draft.subjectCodes, s.code) })}>{s.name}</Chip>
              ))}
            </div>
          </Block>
          <Block title="Documents concernés">
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <Chip key={t} on={draft.resourceTypes.includes(t)} onClick={() => setDraft({ ...draft, resourceTypes: toggle(draft.resourceTypes, t).length ? toggle(draft.resourceTypes, t) : draft.resourceTypes })}>{TYPE_LABELS[t] ?? t}</Chip>
              ))}
            </div>
          </Block>
          <Block title="Rubriques (intitulés exacts du document)">
            <div className="grid gap-2">
              {draft.sections.map((s, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                  <BubbleField aria-label={`Intitulé ${i + 1}`} value={s.label} onChange={(e) => {
                    const sections = draft.sections.map((x, k) => (k === i ? { ...x, label: e.target.value } : x));
                    const g = { ...draft.guidance, [e.target.value]: draft.guidance[s.label] ?? "" };
                    setDraft({ ...draft, sections, guidance: g });
                  }} />
                  <BubbleField aria-label={`Consigne ${i + 1}`} placeholder="Ce que le guide demande d'y mettre" value={draft.guidance[s.label] ?? ""} onChange={(e) => setDraft({ ...draft, guidance: { ...draft.guidance, [s.label]: e.target.value } })} />
                  <BubbleButton type="button" size="sm" aria-label="Retirer la rubrique" onClick={() => setDraft({ ...draft, sections: draft.sections.filter((_, k) => k !== i) })}><X size={14} /></BubbleButton>
                </div>
              ))}
            </div>
          </Block>
          <Block title="Démarche (étapes, dans l'ordre)">
            <div className="grid gap-2">
              {draft.steps.map((s, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[1.2fr_90px_2fr_auto]">
                  <BubbleField aria-label={`Étape ${i + 1}`} value={s.name} onChange={(e) => setDraft({ ...draft, steps: draft.steps.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)) })} />
                  <BubbleField aria-label={`Durée ${i + 1} (min)`} type="number" min={1} max={120} placeholder="min" value={s.durationMin ?? ""} onChange={(e) => setDraft({ ...draft, steps: draft.steps.map((x, k) => (k === i ? { ...x, durationMin: e.target.value ? Number(e.target.value) : null } : x)) })} />
                  <BubbleField aria-label={`But ${i + 1}`} placeholder="But de l'étape" value={s.purpose ?? ""} onChange={(e) => setDraft({ ...draft, steps: draft.steps.map((x, k) => (k === i ? { ...x, purpose: e.target.value } : x)) })} />
                  <BubbleButton type="button" size="sm" aria-label="Retirer l'étape" onClick={() => setDraft({ ...draft, steps: draft.steps.filter((_, k) => k !== i) })}><Trash2 size={14} /></BubbleButton>
                </div>
              ))}
              {draft.steps.length < 12 && (
                <BubbleButton type="button" size="sm" className="w-fit" onClick={() => setDraft({ ...draft, steps: [...draft.steps, { name: "" }] })}><Plus size={14} /> Ajouter une étape</BubbleButton>
              )}
            </div>
          </Block>
          <label className="grid gap-1.5">
            <span className="text-[12.5px] font-medium text-muted">Règles de rédaction (une par ligne)</span>
            <textarea value={draft.conventions} onChange={(e) => setDraft({ ...draft, conventions: e.target.value })} rows={4} className="bubble-field rounded-2xl p-3 text-[13.5px] outline-none" />
          </label>
          <div className="flex flex-wrap gap-2">
            <BubbleButton tone="ink" disabled={save.isPending}>{save.isPending ? "Enregistrement…" : "Enregistrer"}</BubbleButton>
            <BubbleButton type="button" onClick={() => setEdit(false)}>Annuler</BubbleButton>
          </div>
          {m.status === "validated" && <p className="text-[12.5px] text-muted">Corriger une méthode validée la repasse « à valider » : la génération attend ta nouvelle validation.</p>}
        </form>
      )}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2">
      <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">{title}</h3>
      {children}
    </section>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors ${on ? "bg-ink text-[var(--canvas)]" : "bg-[var(--surface-2)] shadow-[0_0_0_1px_var(--line)] hover:bg-ink/5"}`}>
      {children}
    </button>
  );
}
