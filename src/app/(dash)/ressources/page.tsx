"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Sparkles } from "lucide-react";
import { api, classLabel, CLASS_LEVELS, STATUS_LABELS, TYPE_LABELS } from "@/lib/api";
import { Empty, PageHeader, Pill, Segmented, Select, Skeleton } from "@/components/ui/kit";

type Row = { _id: string; title: string; type: string; status: string; classLevel: string; subjectCode: string; difficulty: string; origin: string; aiReview?: { score?: number; issues?: unknown[] }; updatedAt: string };

function ResourcesInner() {
  const params = useSearchParams();
  const router = useRouter();
  const status = params.get("status") ?? "HUMAN_REVIEW";
  const classLevel = params.get("classLevel") ?? "";
  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v);
    else p.delete(k);
    router.replace(`/ressources?${p}`);
  };
  const query = new URLSearchParams({ limit: "50", ...(status !== "ALL" ? { status } : {}), ...(classLevel ? { classLevel } : {}) });
  const { data, isLoading } = useQuery({ queryKey: ["resources", status, classLevel], queryFn: () => api<{ items: Row[]; total: number }>(`admin/resources?${query}`) });

  return (
    <>
      <PageHeader eyebrow="Bibliothèque" title="Relecture & ressources" description="Aucune ressource n'est visible par les enseignants sans validation humaine puis publication." />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Segmented
          value={status}
          onChange={(v) => set("status", v)}
          options={[
            { value: "HUMAN_REVIEW", label: "À relire" },
            { value: "APPROVED", label: "Approuvées" },
            { value: "PUBLISHED", label: "Publiées" },
            { value: "REJECTED", label: "Rejetées" },
            { value: "ALL", label: "Toutes" },
          ]}
        />
        <Select value={classLevel} onChange={(e) => set("classLevel", e.target.value)} className="w-44">
          <option value="">Toutes les classes</option>
          {CLASS_LEVELS.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </Select>
        <span className="ml-auto text-[13px] text-muted">{data?.total ?? "…"} ressource(s)</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : !data?.items.length ? (
        <Empty title="Rien ici pour le moment">Lance une production depuis l’usine IA ou change de filtre.</Empty>
      ) : (
        <ul className="card divide-y divide-[var(--line)] overflow-hidden">
          {data.items.map((r, i) => (
            <li key={r._id} className="rise-in" style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
              <Link href={`/ressources/${r._id}`} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-black/[.02]">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-medium">{r.title}</p>
                  <p className="mt-0.5 text-[12.5px] text-muted">
                    {TYPE_LABELS[r.type] ?? r.type} · {classLabel(r.classLevel)} · {r.subjectCode} · {r.difficulty}
                    {r.origin === "ai" && <Sparkles size={12} className="ml-1.5 inline text-[#8a2be2]" />}
                  </p>
                </div>
                {typeof r.aiReview?.score === "number" && (
                  <span className="hidden text-[12.5px] text-muted sm:block">
                    Score IA <b className="text-ink">{r.aiReview.score}</b> · {r.aiReview.issues?.length ?? 0} remarque(s)
                  </span>
                )}
                <Pill status={r.status}>{STATUS_LABELS[r.status]}</Pill>
                <ChevronRight size={17} className="text-faint transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function ResourcesPage() {
  return (
    <Suspense>
      <ResourcesInner />
    </Suspense>
  );
}
