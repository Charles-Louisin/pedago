"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, Check, ExternalLink, FileText, RotateCcw, Send, X } from "lucide-react";
import { api, classLabel, STATUS_LABELS, TYPE_LABELS } from "@/lib/api";
import { BubbleButton } from "@/components/ui/Bubble";
import { PageHeader, Pill, Skeleton } from "@/components/ui/kit";

type Exercise = { prompt: string; answer: string; explanation?: string; points?: number; competency?: string; illustration?: string };
type Content = {
  competency?: string;
  objectives: string[];
  prerequisites: string[];
  materials: string[];
  lowResourceAlternatives: string[];
  largeClassTips: string[];
  steps: { name: string; durationMin: number; teacherActivities: string[]; learnerActivities: string[] }[];
  writtenTrace?: string;
  exercises: Exercise[];
  assessment: Exercise[];
  localContext: string[];
  body?: string;
};
type Detail = {
  resource: {
    _id: string; title: string; type: string; status: string; classLevel: string; subjectCode: string; difficulty: string; illustrationLevel: string;
    contentVersion: number; origin: string; content: Content; sources: { sourceId: string; pages: number[] }[];
    aiReview?: { score?: number; issues?: { severity: string; area: string; message: string }[]; model?: string };
  };
  node: { title: string; objectives: string[] } | null;
  sources: { _id: string; title: string; issuer: string; url?: string; fileUrl?: string }[];
  reviews: { _id: string; decision: string; comment?: string; toStatus?: string; createdAt: string; reviewerId?: { fullName: string } }[];
  versions: { contentVersion: number; createdAt: string }[];
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-[var(--line)] py-5 first:border-0 first:pt-0">
      <h3 className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted">{title}</h3>
      <div className="text-[14.5px] leading-relaxed text-ink-2">{children}</div>
    </section>
  );
}

const List = ({ items }: { items: string[] }) => (
  <ul className="space-y-1.5">
    {items.map((x, i) => (
      <li key={i} className="flex gap-2.5"><span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-ink/40" />{x}</li>
    ))}
  </ul>
);

export default function ResourceReview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["resource", id], queryFn: () => api<Detail>(`admin/resources/${id}`) });

  const transition = useMutation({
    mutationFn: (to: string) => api(`admin/resources/${id}/transition`, { method: "POST", body: { to, comment: comment || undefined } }),
    onSuccess: (_d, to) => {
      toast.success(`Statut : ${STATUS_LABELS[to]}`);
      setComment("");
      qc.invalidateQueries({ queryKey: ["resource", id] });
      qc.invalidateQueries({ queryKey: ["resources"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const revise = useMutation({
    mutationFn: () => api(`admin/resources/${id}/revise`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["resource", id] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const regenerate = useMutation({
    mutationFn: () => api(`admin/ai/jobs`, { method: "POST", body: { kind: "review_resource", params: { resourceId: id } } }),
    onSuccess: () => toast.success("Nouvelle relecture IA demandée"),
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) return <div className="space-y-3"><Skeleton className="h-20" /><Skeleton className="h-[60vh]" /></div>;
  const { resource: r, node, sources, reviews } = data;
  const c = r.content;
  const issues = r.aiReview?.issues ?? [];

  return (
    <>
      <Link href="/ressources" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink">
        <ArrowLeft size={15} /> Ressources
      </Link>
      <PageHeader
        eyebrow={`${TYPE_LABELS[r.type] ?? r.type} · ${classLabel(r.classLevel)} · ${r.subjectCode} · v${r.contentVersion}`}
        title={r.title}
        actions={<Pill status={r.status}>{STATUS_LABELS[r.status]}</Pill>}
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <article className="card p-7">
          {node && (
            <Section title="Leçon du référentiel">
              <p className="font-medium text-ink">{node.title}</p>
              <List items={node.objectives} />
            </Section>
          )}
          {c.competency && <Section title="Compétence visée">{c.competency}</Section>}
          {!!c.objectives?.length && <Section title="Objectifs"><List items={c.objectives} /></Section>}
          {!!c.prerequisites?.length && <Section title="Prérequis"><List items={c.prerequisites} /></Section>}
          {!!c.materials?.length && <Section title="Matériel"><List items={c.materials} /></Section>}
          {!!c.steps?.length && (
            <Section title="Déroulement">
              <ol className="space-y-3">
                {c.steps.map((s, i) => (
                  <li key={i} className="rounded-2xl bg-[var(--surface-2)] p-4 shadow-[0_0_0_1px_var(--line)]">
                    <p className="flex justify-between text-[14px] font-semibold text-ink">
                      <span>{i + 1}. {s.name}</span><span className="text-muted">{s.durationMin} min</span>
                    </p>
                    <div className="mt-2 grid gap-3 text-[13.5px] sm:grid-cols-2">
                      <div><p className="mb-1 text-[11.5px] font-semibold text-muted">Enseignant</p><List items={s.teacherActivities} /></div>
                      <div><p className="mb-1 text-[11.5px] font-semibold text-muted">Apprenants</p><List items={s.learnerActivities} /></div>
                    </div>
                  </li>
                ))}
              </ol>
            </Section>
          )}
          {c.writtenTrace && <Section title="Trace écrite"><p className="whitespace-pre-line">{c.writtenTrace}</p></Section>}
          {c.body && <Section title="Contenu"><p className="whitespace-pre-line">{c.body}</p></Section>}
          {[["Exercices", c.exercises], ["Évaluation", c.assessment]].map(([title, list]) =>
            (list as Exercise[])?.length ? (
              <Section key={title as string} title={title as string}>
                <ol className="space-y-3">
                  {(list as Exercise[]).map((e, i) => (
                    <li key={i}>
                      <p className="text-ink">{i + 1}. {e.prompt} {e.points !== undefined && <span className="text-muted">({e.points} pts)</span>}</p>
                      <p className="mt-1 rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-[13.5px] text-accent"><b>Corrigé :</b> {e.answer}{e.explanation ? ` — ${e.explanation}` : ""}</p>
                      {e.illustration && <p className="mt-1 text-[12.5px] italic text-muted">Illustration : {e.illustration}</p>}
                    </li>
                  ))}
                </ol>
              </Section>
            ) : null
          )}
          {!!c.lowResourceAlternatives?.length && <Section title="Sans électricité ni matériel spécialisé"><List items={c.lowResourceAlternatives} /></Section>}
          {!!c.largeClassTips?.length && <Section title="Classe nombreuse"><List items={c.largeClassTips} /></Section>}
          {!!c.localContext?.length && <Section title="Ancrage local"><List items={c.localContext} /></Section>}
        </article>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <div className="card p-5">
            <p className="text-[13px] font-semibold">Décision</p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Commentaire pour l'historique éditorial (facultatif)"
              className="bubble-field mt-3 h-24 w-full resize-none rounded-2xl bg-transparent p-3.5 text-[13.5px] outline-none"
              style={{ borderRadius: 16 }}
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              {r.status === "HUMAN_REVIEW" && (
                <>
                  <BubbleButton tone="green" onClick={() => transition.mutate("APPROVED")} disabled={transition.isPending}><Check size={16} /> Approuver</BubbleButton>
                  <BubbleButton tone="red" onClick={() => transition.mutate("REJECTED")} disabled={transition.isPending}><X size={16} /> Rejeter</BubbleButton>
                </>
              )}
              {["DRAFT", "AI_CHECKED", "REJECTED"].includes(r.status) && (
                <BubbleButton className="col-span-2" onClick={() => transition.mutate("HUMAN_REVIEW")}>Envoyer en relecture</BubbleButton>
              )}
              {r.status === "APPROVED" && (
                <BubbleButton tone="ink" className="col-span-2" onClick={() => transition.mutate("PUBLISHED")}><Send size={15} /> Publier</BubbleButton>
              )}
              {r.status === "PUBLISHED" && (
                <BubbleButton className="col-span-2" onClick={() => revise.mutate()}><RotateCcw size={15} /> Créer une révision</BubbleButton>
              )}
              <BubbleButton size="sm" className="col-span-2" onClick={() => regenerate.mutate()}>Nouvelle relecture IA</BubbleButton>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold">Contrôle IA indépendant</p>
              {typeof r.aiReview?.score === "number" && <span className="text-[20px] font-semibold">{r.aiReview.score}<span className="text-[12px] text-muted">/100</span></span>}
            </div>
            {issues.length ? (
              <ul className="mt-3 space-y-2">
                {issues.map((i, k) => (
                  <li key={k} className="flex gap-2 text-[13px]">
                    <AlertTriangle size={14} className={`mt-0.5 shrink-0 ${i.severity === "error" ? "text-red" : "text-sun"}`} />
                    <span><b className="font-semibold">{i.area}</b> — {i.message}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[13px] text-muted">{r.aiReview ? "Aucune remarque." : "Pas encore contrôlée."}</p>
            )}
          </div>

          <div className="card p-5">
            <p className="text-[13px] font-semibold">Sources citées</p>
            {sources.length ? (
              <ul className="mt-3 space-y-2.5">
                {sources.map((s) => {
                  const pages = r.sources.find((x) => x.sourceId === s._id)?.pages ?? [];
                  const href = s.fileUrl ?? s.url;
                  return (
                    <li key={s._id} className="flex gap-2.5 text-[13px]">
                      <FileText size={15} className="mt-0.5 shrink-0 text-muted" />
                      <div className="min-w-0">
                        <p className="font-medium">{s.title}</p>
                        <p className="text-muted">{s.issuer}{pages.length ? ` · p. ${pages.join(", ")}` : ""}</p>
                        {href && <a href={href} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-green hover:underline">Ouvrir <ExternalLink size={12} /></a>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={`mt-2 text-[13px] ${r.origin === "ai" ? "text-red" : "text-muted"}`}>{r.origin === "ai" ? "Aucune source : une ressource IA ne peut pas être approuvée sans source." : "Aucune source rattachée (contenu de démonstration)."}</p>
            )}
          </div>

          <div className="card p-5">
            <p className="text-[13px] font-semibold">Historique</p>
            <ul className="mt-3 space-y-3">
              {reviews.length ? reviews.map((v) => (
                <li key={v._id} className="text-[12.5px]">
                  <p><b>{v.reviewerId?.fullName ?? "—"}</b> · {v.toStatus ? STATUS_LABELS[v.toStatus] : v.decision}</p>
                  {v.comment && <p className="text-muted">{v.comment}</p>}
                  <p className="text-faint">{new Date(v.createdAt).toLocaleString("fr-FR")}</p>
                </li>
              )) : <li className="text-[12.5px] text-muted">Aucune décision.</li>}
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
