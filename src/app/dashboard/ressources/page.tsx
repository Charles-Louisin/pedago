"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronRight, Sparkles } from "lucide-react";
import { api, classLabel, CLASS_LEVELS, STATUS_LABELS, TYPE_LABELS } from "@/lib/api";
import { BubbleButton, BubbleSearch } from "@/components/ui/Bubble";
import { Empty, PageHeader, Pill, Segmented, Select, Skeleton } from "@/components/ui/kit";

type Row = { _id: string; title: string; type: string; status: string; classLevel: string; subjectCode: string; difficulty: string; origin: string; aiReview?: { score?: number; issues?: unknown[] }; updatedAt: string };

/** Actions possibles sur une sélection, selon le statut affiché. */
const BATCH: Record<string, { to: string; label: string; tone: "green" | "red" | "default" }[]> = {
  HUMAN_REVIEW: [
    { to: "APPROVED", label: "Approuver", tone: "green" },
    { to: "REJECTED", label: "Rejeter", tone: "red" },
  ],
  APPROVED: [{ to: "PUBLISHED", label: "Publier", tone: "green" }],
};

function ResourcesInner() {
  const params = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const status = params.get("status") ?? "HUMAN_REVIEW";
  const classLevel = params.get("classLevel") ?? "";
  const subjectCode = params.get("subjectCode") ?? "";
  const q = params.get("q") ?? "";
  const [search, setSearch] = useState(q);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v);
    else p.delete(k);
    setPicked(new Set());
    router.replace(`/dashboard/ressources?${p}`);
  };
  // Recherche appliquée après une courte pause de frappe.
  useEffect(() => {
    if (search === q) return;
    const t = setTimeout(() => set("q", search.trim()), 300);
    return () => clearTimeout(t);
  });
  const query = new URLSearchParams({ limit: "50", ...(status !== "ALL" ? { status } : {}), ...(classLevel ? { classLevel } : {}), ...(subjectCode ? { subjectCode } : {}), ...(q ? { q } : {}) });
  const { data, isLoading } = useQuery({ queryKey: ["resources", status, classLevel, subjectCode, q], queryFn: () => api<{ items: Row[]; total: number }>(`admin/resources?${query}`) });
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: () => api<{ code: string; name: string; subsystem: string }[]>("admin/subjects") });
  const actions = BATCH[status] ?? [];
  const all = data?.items ?? [];
  const allOn = all.length > 0 && all.every((r) => picked.has(r._id));

  /** Validation par lot : chaque ressource passe par les mêmes contrôles qu'à l'unité (PDF lu, contrôles, sources). */
  async function batch(to: string, label: string) {
    setBusy(true);
    const ids = [...picked];
    const fails: string[] = [];
    for (const id of ids) {
      try {
        await api(`admin/resources/${id}/transition`, { method: "POST", body: { to } });
      } catch (e) {
        const r = all.find((x) => x._id === id);
        fails.push(`${r?.title ?? id} : ${(e as Error).message}`);
      }
    }
    setBusy(false);
    setPicked(new Set());
    qc.invalidateQueries({ queryKey: ["resources"] });
    const ok = ids.length - fails.length;
    if (ok) toast.success(`${label} : ${ok} ressource(s)`);
    if (fails.length) toast.error(`${fails.length} refus : ${fails.slice(0, 3).join(" · ")}${fails.length > 3 ? "…" : ""}`, { duration: 9000 });
  }

  return (
    <>
      <PageHeader eyebrow="Bibliothèque" title="Relecture & ressources" description="Aucune ressource n'est visible par les enseignants sans validation humaine puis publication." />
      <div className="mb-3 flex flex-wrap items-center gap-3">
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
        <span className="ml-auto text-[13px] text-muted">{data?.total ?? "…"} ressource(s)</span>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem_13rem]">
        <BubbleSearch value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un titre…" aria-label="Rechercher" />
        <Select value={classLevel} onChange={(e) => set("classLevel", e.target.value)} aria-label="Classe">
          <option value="">Toutes les classes</option>
          {CLASS_LEVELS.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </Select>
        <Select value={subjectCode} onChange={(e) => set("subjectCode", e.target.value)} aria-label="Matière">
          <option value="">Toutes les matières</option>
          {subjects.data
            ?.filter((s) => !classLevel || (s.subsystem === "anglophone") === classLevel.startsWith("CLASS_"))
            .map((s) => (
              <option key={`${s.subsystem}-${s.code}`} value={s.code}>{s.name}</option>
            ))}
        </Select>
      </div>

      {actions.length > 0 && all.length > 0 && (
        <div className="card mb-3 flex flex-wrap items-center gap-3 px-5 py-3">
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={allOn} onChange={() => setPicked(allOn ? new Set() : new Set(all.map((r) => r._id)))} className="h-4 w-4 accent-[var(--accent)]" />
            {picked.size ? `${picked.size} sélectionnée(s)` : "Tout sélectionner"}
          </label>
          <span className="hidden text-[12px] text-faint md:inline">Chaque PDF doit avoir été ouvert avant d’approuver ou de publier.</span>
          <div className="ml-auto flex flex-wrap gap-2">
            {actions.map((a) => (
              <BubbleButton key={a.to} size="sm" tone={a.tone} disabled={!picked.size || busy} onClick={() => batch(a.to, a.label)}>
                {a.label} {picked.size ? `(${picked.size})` : ""}
              </BubbleButton>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : !all.length ? (
        <Empty title="Rien ici pour le moment">Lance une construction depuis « Construire ma bibliothèque » ou change de filtre.</Empty>
      ) : (
        <ul className="card divide-y divide-[var(--line)] overflow-hidden">
          {all.map((r, i) => (
            <li key={r._id} className="rise-in flex items-center" style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
              {actions.length > 0 && (
                <label className="flex shrink-0 items-center self-center pl-5" aria-label={`Sélectionner ${r.title}`}>
                  <input
                    type="checkbox"
                    checked={picked.has(r._id)}
                    onChange={() => {
                      const n = new Set(picked);
                      if (n.has(r._id)) n.delete(r._id);
                      else n.add(r._id);
                      setPicked(n);
                    }}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                </label>
              )}
              <Link href={`/dashboard/ressources/${r._id}`} className="group flex min-w-0 flex-1 items-center gap-4 px-5 py-4 transition-colors hover:bg-ink/[.02]">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-medium">{r.title}</p>
                  <p className="mt-0.5 truncate text-[12.5px] text-muted">
                    {TYPE_LABELS[r.type] ?? r.type} · {classLabel(r.classLevel)} · {r.subjectCode} · {r.difficulty}
                    {r.origin === "ai" && <Sparkles size={12} className="ml-1.5 inline text-accent" />}
                  </p>
                </div>
                {typeof r.aiReview?.score === "number" && (
                  <span className="hidden shrink-0 text-[12.5px] text-muted lg:block">
                    Score IA <b className="text-ink">{r.aiReview.score}</b> · {r.aiReview.issues?.length ?? 0} remarque(s)
                  </span>
                )}
                <span className="shrink-0"><Pill status={r.status}>{STATUS_LABELS[r.status]}</Pill></span>
                <ChevronRight size={17} className="shrink-0 text-faint transition-transform group-hover:translate-x-0.5" />
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
