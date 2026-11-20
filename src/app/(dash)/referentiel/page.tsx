"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { api, CLASS_LEVELS } from "@/lib/api";
import { BubbleButton } from "@/components/ui/Bubble";
import { Empty, PageHeader, Pill, Select, Skeleton } from "@/components/ui/kit";

type Node = { _id: string; title: string; objectives: string[]; subjectCode: string; order: number; term?: number; priority: number; status: string; durationMin: number; sourceRefs: { pages: number[] }[] };

const PRIORITY = ["", "Essentielle", "Normale", "Révision"];

export default function Referentiel() {
  const qc = useQueryClient();
  const [classLevel, setClassLevel] = useState("CP");
  const [subjectCode, setSubjectCode] = useState("");
  const subsystem = classLevel.startsWith("CLASS_") ? "anglophone" : "francophone";
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: () => api<{ code: string; name: string; subsystem: string }[]>("admin/subjects") });
  const q = new URLSearchParams({ classLevel, kind: "lesson", ...(subjectCode ? { subjectCode } : {}) });
  const { data, isLoading } = useQuery({ queryKey: ["nodes", classLevel, subjectCode], queryFn: () => api<Node[]>(`admin/nodes?${q}`) });

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Node> }) => api(`admin/nodes/${id}`, { method: "PATCH", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nodes"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader eyebrow="Bibliothèque" title="Référentiel" description="Programme officiel structuré en leçons. Une leçon extraite par l'IA doit être validée ici avant toute génération de ressource." />
      <div className="mb-5 flex flex-wrap gap-3">
        <Select value={classLevel} onChange={(e) => { setClassLevel(e.target.value); setSubjectCode(""); }} className="w-44">
          {CLASS_LEVELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        <Select value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} className="w-72">
          <option value="">Toutes les matières</option>
          {subjects.data?.filter((s) => s.subsystem === subsystem).map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
        </Select>
      </div>
      {isLoading ? <Skeleton className="h-96" /> : !data?.length ? <Empty title="Aucune leçon">Extrais un programme depuis la page Sources.</Empty> : (
        <ul className="card divide-y divide-[var(--line)]">
          {data.map((n) => (
            <li key={n._id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
              <span className="w-8 text-[12px] tabular-nums text-faint">{n.order}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium">{n.title} <span className="font-normal text-muted">· {n.subjectCode}{n.term ? ` · T${n.term}` : ""} · {n.durationMin} min</span></p>
                <p className="truncate text-[12.5px] text-muted">{n.objectives.join(" · ")}</p>
              </div>
              <select value={n.priority} onChange={(e) => patch.mutate({ id: n._id, body: { priority: Number(e.target.value) } })} className="bubble-field h-8 px-3 text-[12.5px] outline-none" aria-label="Priorité">
                {[1, 2, 3].map((p) => <option key={p} value={p}>{PRIORITY[p]}</option>)}
              </select>
              <Pill status={n.status}>{n.status === "validated" ? "Validée" : n.status === "extracted" ? "À valider" : "Retirée"}</Pill>
              {n.status === "extracted" && <BubbleButton size="sm" tone="green" onClick={() => patch.mutate({ id: n._id, body: { status: "validated" } })}><Check size={14} /> Valider</BubbleButton>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
