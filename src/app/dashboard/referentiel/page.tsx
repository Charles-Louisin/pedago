"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, CheckCheck, X } from "lucide-react";
import { api, classLabel, CLASS_LEVELS } from "@/lib/api";
import { BubbleButton } from "@/components/ui/Bubble";
import { Empty, PageHeader, Pill, Select, Skeleton } from "@/components/ui/kit";

type Node = {
  _id: string;
  kind: "domain" | "competency" | "unit" | "lesson";
  parentId?: string;
  title: string;
  label?: string;
  objectives: string[];
  subjectCode: string;
  classLevel: string;
  order: number;
  term?: number;
  week?: number;
  period?: string;
  status: "extracted" | "validated" | "retired";
  durationMin: number;
  durationStated?: boolean;
  sourceRefs: { sourceId: string; pages: number[] }[];
};
type Source = { _id: string; title: string; docType: string; extraction?: { status?: string; classes?: string[] } };

const KIND: Record<Node["kind"], string> = { domain: "Domaine", competency: "Compétence", unit: "Unité", lesson: "Leçon" };

export default function ReferentielPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Referentiel />
    </Suspense>
  );
}

/**
 * Référentiel : tout ce que l'analyse des programmes (Sources) a extrait, rangé par classe, matière et unité,
 * avec les pages du document. Une validation par lot fait passer la sélection « validée » : c'est ce qui
 * alimente ensuite la bibliothèque et l'app des enseignants.
 */
function Referentiel() {
  const qc = useQueryClient();
  const params = useSearchParams();
  const [sourceId, setSourceId] = useState(params.get("sourceId") ?? "");
  const sources = useQuery({ queryKey: ["sources"], queryFn: () => api<{ items: Source[] }>("admin/sources?limit=100") });
  const programs = (sources.data?.items ?? []).filter((s) => s.docType === "curriculum" && s.extraction?.status === "done");
  const sourceClasses = programs.find((s) => s._id === sourceId)?.extraction?.classes ?? [];
  const [classPick, setClassLevel] = useState("");
  const classLevel = classPick || sourceClasses[0] || "CP";
  const [subjectCode, setSubjectCode] = useState("");
  const subsystem = classLevel.startsWith("CLASS_") ? "anglophone" : "francophone";
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: () => api<{ code: string; name: string; subsystem: string }[]>("admin/subjects") });
  const subjectName = (code: string) => subjects.data?.find((s) => s.code === code && s.subsystem === subsystem)?.name ?? code;

  const q = new URLSearchParams({ classLevel, ...(subjectCode ? { subjectCode } : {}), ...(sourceId ? { sourceId } : {}) });
  const { data, isLoading } = useQuery({ queryKey: ["nodes", classLevel, subjectCode, sourceId], queryFn: () => api<Node[]>(`admin/nodes?${q}`) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["nodes"] });

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Node> }) => api(`admin/nodes/${id}`, { method: "PATCH", body }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });
  const validateAll = useMutation({
    mutationFn: () => api<{ validated: number }>("admin/nodes/validate", { method: "POST", body: { classLevel, ...(subjectCode ? { subjectCode } : {}), ...(sourceId ? { sourceId } : {}) } }),
    onSuccess: (r) => {
      toast.success(r.validated ? `${r.validated} élément(s) validé(s) : ils alimentent la bibliothèque` : "Rien à valider dans cette sélection");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Arbre : matière → chemin (domaine, compétence, unité) → leçons, dans l'ordre du document.
  const tree = useMemo(() => {
    const nodes = data ?? [];
    const byId = new Map(nodes.map((n) => [n._id, n]));
    const pathOf = (n: Node) => {
      const out: Node[] = [];
      let cur = n.parentId ? byId.get(n.parentId) : undefined;
      while (cur) {
        out.unshift(cur);
        cur = cur.parentId ? byId.get(cur.parentId) : undefined;
      }
      return out;
    };
    const groups = new Map<string, { subject: string; heading: string; lessons: Node[]; order: number }[]>();
    for (const l of nodes.filter((n) => n.kind === "lesson").sort((a, b) => a.order - b.order)) {
      const path = pathOf(l);
      const heading = path.map((p) => (p.label ? `${p.label} — ${p.title}` : p.title)).join(" › ") || "Sans unité";
      const list = groups.get(l.subjectCode) ?? [];
      const g = list.find((x) => x.heading === heading);
      if (g) g.lessons.push(l);
      else list.push({ subject: l.subjectCode, heading, lessons: [l], order: l.order });
      groups.set(l.subjectCode, list);
    }
    return [...groups.entries()];
  }, [data]);

  const pending = (data ?? []).filter((n) => n.status === "extracted").length;
  const lessons = (data ?? []).filter((n) => n.kind === "lesson");

  return (
    <>
      <PageHeader
        eyebrow="Bibliothèque"
        title="Référentiel"
        description="Ce que l'analyse de tes programmes (Sources) a extrait : classes, matières, unités et leçons, dans l'ordre du document. Valide-les ici : seules les leçons validées alimentent la bibliothèque et l'app."
      />
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <Select label="Document" value={sourceId} onChange={(e) => { setSourceId(e.target.value); setClassLevel(""); setSubjectCode(""); }} className="w-80">
          <option value="">Tous les documents</option>
          {programs.map((s) => <option key={s._id} value={s._id}>{s.title}</option>)}
        </Select>
        <Select label="Classe" value={classLevel} onChange={(e) => { setClassLevel(e.target.value); setSubjectCode(""); }} className="w-44">
          {CLASS_LEVELS.filter(([v]) => !sourceClasses.length || sourceClasses.includes(v)).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        <Select label="Matière" value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} className="w-72">
          <option value="">Toutes les matières</option>
          {subjects.data?.filter((s) => s.subsystem === subsystem).map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
        </Select>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[12.5px] text-muted">{lessons.length} leçon{lessons.length > 1 ? "s" : ""} · {pending} élément{pending > 1 ? "s" : ""} à valider</span>
          <BubbleButton tone="green" disabled={!pending || validateAll.isPending} onClick={() => validateAll.mutate()}>
            <CheckCheck size={16} /> Tout valider ({classLabel(classLevel)}{subjectCode ? ` · ${subjectName(subjectCode)}` : ""})
          </BubbleButton>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : !lessons.length ? (
        <Empty title="Aucune leçon">
          Dépose le programme officiel dans <Link href="/dashboard/sources" className="font-medium text-ink underline-offset-2 hover:underline">Sources</Link> et marque-le « Vérifiée » : son analyse range ici les leçons de chaque classe.
        </Empty>
      ) : (
        <div className="grid gap-6">
          {tree.map(([code, groups]) => (
            <section key={code} className="card overflow-hidden">
              <h2 className="border-b border-[var(--line)] px-5 py-3 text-[15px] font-semibold">{subjectName(code)}</h2>
              {groups.map((g) => (
                <div key={g.heading}>
                  <p className="bg-[var(--surface-2)] px-5 py-2 text-[12.5px] font-semibold text-ink-2">{g.heading}</p>
                  <ul className="divide-y divide-[var(--line)]">
                    {g.lessons.map((n, i) => (
                      <li key={n._id} className="flex flex-wrap items-center gap-4 px-5 py-3">
                        <span className="w-14 text-[12px] tabular-nums text-faint">{KIND.lesson} {i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-medium">
                            {n.title}
                            <span className="font-normal text-muted">
                              {n.term ? ` · T${n.term}` : ""}{n.week ? ` · semaine ${n.week}` : ""}{n.durationStated ? ` · ${n.durationMin} min` : ""}
                              {n.sourceRefs?.[0]?.pages?.length ? ` · p. ${n.sourceRefs[0].pages.join(", ")}` : ""}
                            </span>
                          </p>
                          {n.objectives.length > 0 && <p className="truncate text-[12.5px] text-muted" title={n.objectives.join(" · ")}>{n.objectives.join(" · ")}</p>}
                        </div>
                        <Pill status={n.status}>{n.status === "validated" ? "Validée" : n.status === "extracted" ? "À valider" : "Écartée"}</Pill>
                        {n.status === "extracted" && (
                          <BubbleButton size="sm" tone="green" onClick={() => patch.mutate({ id: n._id, body: { status: "validated" } })}><Check size={14} /> Valider</BubbleButton>
                        )}
                        {n.status !== "retired" && (
                          <BubbleButton size="sm" aria-label="Écarter cette leçon" onClick={() => patch.mutate({ id: n._id, body: { status: "retired" } })}><X size={14} /></BubbleButton>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
