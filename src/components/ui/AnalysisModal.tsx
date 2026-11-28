"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertTriangle, BookOpen, Check, FileSearch, Layers, ListChecks, RotateCcw, ScanText, X } from "lucide-react";
import { api, classLabel } from "@/lib/api";
import { BubbleButton } from "@/components/ui/Bubble";

type Progress = {
  title: string;
  status: "none" | "running" | "done" | "failed";
  stage?: "read" | "identify" | "chunks" | "finish" | "done" | "failed";
  error?: string | null;
  startedAt?: string;
  spentUsd?: number;
  budgetUsd?: number;
  pages?: number | null;
  identified?: { subsystem: string; classes: string[]; subjects: { code: string; name: string }[]; containsMethod: boolean } | null;
  chunks?: { index: number; from: number; to: number; status: string; saved: number | null }[];
  found?: { domains: number; competencies: number; units: number; lessons: number; subjectsWithLessons: number };
  etaMs?: number | null;
};

const STAGES = [
  { key: "read", label: "Lecture du document", icon: ScanText },
  { key: "identify", label: "Identification", icon: FileSearch },
  { key: "chunks", label: "Extraction des leçons", icon: Layers },
  { key: "finish", label: "Bilan", icon: ListChecks },
] as const;
const ORDER = ["read", "identify", "chunks", "finish", "done"];
const EASE = [0.22, 1, 0.36, 1] as const;

const duration = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m} min ${String(s % 60).padStart(2, "0")} s` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
};

/** Part du travail faite (0 à 1) : lecture 5 %, identification 10 %, parties 80 %, bilan 5 %. */
function share(p: Progress) {
  if (p.status === "done") return 1;
  const stage = ORDER.indexOf(p.stage ?? "read");
  const chunks = p.chunks ?? [];
  const doneChunks = chunks.filter((c) => c.status === "done").length;
  return Math.min(0.99, (stage > 0 ? 0.05 : 0) + (stage > 1 ? 0.1 : 0) + (chunks.length ? (doneChunks / chunks.length) * 0.8 : 0) + (stage > 3 ? 0.05 : 0));
}

/**
 * Fenêtre de suivi d'une analyse de programme : progression, étapes, parties du document (faites, en cours,
 * à venir), ce qui est déjà trouvé, temps écoulé et restant, coût. Se ferme sans interrompre l'analyse.
 */
export function AnalysisModal({ sourceId, onClose, onRetry }: { sourceId: string | null; onClose: () => void; onRetry?: (id: string) => void }) {
  const reduce = useReducedMotion();
  const [now, setNow] = useState(() => Date.now());
  const q = useQuery({
    queryKey: ["source-progress", sourceId],
    queryFn: () => api<Progress>(`admin/sources/${sourceId}/progress`),
    enabled: Boolean(sourceId),
    refetchInterval: (query) => (query.state.data?.status === "running" || !query.state.data ? 2000 : false),
  });
  const p = q.data;

  useEffect(() => {
    if (!sourceId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const tick = setInterval(() => setNow(Date.now()), 1000);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearInterval(tick);
    };
  }, [sourceId, onClose]);

  if (!sourceId || typeof document === "undefined") return null;
  const ratio = p ? share(p) : 0;
  const stageIndex = ORDER.indexOf(p?.stage ?? "read");
  const chunks = p?.chunks ?? [];
  const doneChunks = chunks.filter((c) => c.status === "done").length;
  const elapsed = p?.startedAt ? now - new Date(p.startedAt).getTime() : 0;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
      <motion.button aria-label="Fermer la fenêtre" className="absolute inset-0 bg-black/40" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="analysis-title"
        className="card relative max-h-[92dvh] w-full max-w-2xl overflow-y-auto p-6 sm:p-7"
        initial={reduce ? false : { opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: EASE }}
      >
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">Analyse du programme</p>
            <h2 id="analysis-title" className="mt-1 truncate text-[18px] font-semibold" title={p?.title}>{p?.title ?? "…"}</h2>
          </div>
          <BubbleButton size="sm" onClick={onClose} aria-label="Fermer">
            <X size={15} />
          </BubbleButton>
        </div>

        {/* Progression */}
        <div className="mt-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="whitespace-nowrap text-[34px] font-semibold tabular-nums tracking-[-0.03em]">{Math.round(ratio * 100)} %</p>
            <p className="text-[12.5px] text-muted sm:text-right">
              {p?.status === "running" && (
                <>
                  {duration(elapsed)} écoulé{p.etaMs ? ` · environ ${duration(p.etaMs)} restant` : ""}
                </>
              )}
              {p?.status === "done" && <>Terminé en {duration(elapsed)}</>}
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/[.07]">
            <motion.div
              className={`h-full rounded-full ${p?.status === "failed" ? "bg-red" : "bg-green"}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(2, ratio * 100)}%` }}
              transition={{ duration: reduce ? 0 : 0.8, ease: EASE }}
            />
          </div>
        </div>

        {/* Étapes */}
        <ol className="mt-6 grid gap-2 sm:grid-cols-4">
          {STAGES.map((s, i) => {
            const state = p?.status === "done" || stageIndex > i ? "done" : p?.status === "failed" && stageIndex === i ? "failed" : stageIndex === i ? "now" : "todo";
            return (
              <li key={s.key} className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-[12.5px] ${state === "now" ? "bg-green/10 font-semibold" : "bg-[var(--surface-2)]"} ${state === "todo" ? "text-faint" : ""}`}>
                <span className={`relative grid h-7 w-7 shrink-0 place-items-center rounded-full ${state === "done" ? "bg-green text-white" : state === "failed" ? "bg-red text-white" : state === "now" ? "bg-green/20 text-green" : "bg-ink/[.06]"}`}>
                  {state === "done" ? <Check size={14} /> : state === "failed" ? <AlertTriangle size={13} /> : <s.icon size={14} />}
                  {state === "now" && !reduce && <motion.span className="absolute inset-0 rounded-full border-2 border-green" animate={{ scale: [1, 1.35], opacity: [0.7, 0] }} transition={{ duration: 1.4, repeat: Infinity }} />}
                </span>
                <span className="leading-tight">
                  {s.label}
                  {s.key === "read" && p?.pages ? <span className="block font-normal text-muted">{p.pages} pages</span> : null}
                  {s.key === "chunks" && chunks.length ? <span className="block font-normal text-muted">{doneChunks} / {chunks.length} parties</span> : null}
                </span>
              </li>
            );
          })}
        </ol>

        {/* Parties du document : faites, en cours, à venir */}
        {chunks.length > 0 && (
          <section className="mt-6">
            <div className="mb-2 flex items-center justify-between text-[12.5px] text-muted">
              <span className="font-semibold text-ink-2">Parties du document</span>
              <span className="flex items-center gap-3">
                <Legend className="bg-green" label="faite" />
                <Legend className="bg-blue" label="en cours" />
                <Legend className="bg-ink/[.08]" label="à venir" />
              </span>
            </div>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-1.5">
              {chunks.map((c) => (
                <motion.li
                  key={c.index}
                  layout
                  title={`Partie ${c.index} · pages ${c.from}–${c.to}${c.saved !== null ? ` · ${c.saved} leçon(s) rangée(s)` : ""}`}
                  className={`rounded-xl px-2 py-1.5 text-center text-[11px] leading-tight ${c.status === "done" ? "bg-green/15 text-green" : c.status === "running" ? "bg-blue/15 text-blue" : c.status === "failed" ? "bg-red/15 text-red" : "bg-ink/[.05] text-faint"}`}
                  animate={c.status === "running" && !reduce ? { opacity: [1, 0.55, 1] } : { opacity: 1 }}
                  transition={c.status === "running" ? { duration: 1.6, repeat: Infinity } : { duration: 0.3 }}
                >
                  <span className="block font-semibold tabular-nums">p. {c.from}–{c.to}</span>
                  <span className="block">{c.status === "done" ? `${c.saved ?? 0} leçon${(c.saved ?? 0) > 1 ? "s" : ""}` : c.status === "running" ? "en cours" : "à venir"}</span>
                </motion.li>
              ))}
            </ul>
          </section>
        )}

        {/* Déjà trouvé */}
        <section className="mt-6 grid gap-3 sm:grid-cols-[1.3fr_1fr]">
          <div className="rounded-2xl bg-[var(--surface-2)] p-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">Classes et matières</p>
            {p?.identified ? (
              <>
                <p className="mt-2 text-[14px] font-semibold">{p.identified.classes.map(classLabel).join(", ")} · {p.identified.subsystem === "anglophone" ? "anglophone" : "francophone"}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <AnimatePresence>
                    {p.identified.subjects.map((s) => (
                      <motion.span key={s.code} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="rounded-full bg-[var(--canvas)] px-2.5 py-1 text-[12px] shadow-[0_0_0_1px_var(--line)]">
                        {s.name}
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </div>
                {p.identified.containsMethod && <p className="mt-2 text-[12px] text-muted">Canevas de fiche repéré : il sera analysé comme méthode de préparation.</p>}
              </>
            ) : (
              <p className="mt-2 text-[13px] text-muted">{p?.status === "failed" ? "—" : "En cours d'identification…"}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Counter icon={Layers} label="Unités" value={p?.found?.units ?? 0} />
            <Counter icon={BookOpen} label="Leçons" value={p?.found?.lessons ?? 0} />
            <Counter icon={ListChecks} label="Compétences" value={p?.found?.competencies ?? 0} />
            <Counter icon={FileSearch} label="Domaines" value={p?.found?.domains ?? 0} />
          </div>
        </section>

        {p?.status === "failed" && (
          <p className="mt-5 rounded-2xl bg-red-500/10 px-4 py-3 text-[13px] text-red-800 dark:text-red-200">
            Analyse interrompue : {p.error}. Les parties déjà faites sont gardées ; une relance reprend là où elle s’est arrêtée.
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1 text-[12.5px] text-muted">
            Coût : <b className="text-ink tabular-nums">{(p?.spentUsd ?? 0).toFixed(3)} $</b>
            {p?.budgetUsd ? ` sur ${p.budgetUsd} $ maximum` : ""}
            {p?.status === "running" ? " · tu peux fermer : l’analyse continue en arrière-plan" : ""}
          </p>
          {p?.status === "failed" && onRetry && (
            <BubbleButton tone="ink" onClick={() => onRetry(sourceId)}>
              <RotateCcw size={15} /> Relancer
            </BubbleButton>
          )}
          {p?.status === "done" && (
            <Link href={`/dashboard/referentiel?sourceId=${sourceId}`} className="bubble bubble-green inline-flex h-11 items-center gap-2 px-5 text-[14px] font-semibold">
              <Check size={16} /> Voir et valider les leçons
            </Link>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-2 w-2 rounded-full ${className}`} /> {label}
    </span>
  );
}

function Counter({ icon: Icon, label, value }: { icon: typeof Layers; label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-[var(--surface-2)] p-3">
      <Icon size={15} className="text-muted" />
      <motion.p key={value} initial={{ y: 6, opacity: 0.4 }} animate={{ y: 0, opacity: 1 }} className="mt-1.5 text-[22px] font-semibold tabular-nums">
        {value}
      </motion.p>
      <p className="text-[12px] text-muted">{label}</p>
    </div>
  );
}
