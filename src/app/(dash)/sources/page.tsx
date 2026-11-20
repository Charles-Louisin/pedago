"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Plus, Wand2 } from "lucide-react";
import { api, CLASS_LEVELS } from "@/lib/api";
import { BubbleButton, BubbleField } from "@/components/ui/Bubble";
import { Empty, PageHeader, Pill, Select, Skeleton } from "@/components/ui/kit";

type Source = { _id: string; title: string; issuer: string; url?: string; fileUrl?: string; docType: string; usageRights: string; status: string; publishedOn?: string; consultedAt: string };

const RIGHTS: Record<string, string> = { public_official: "Texte officiel public", licensed: "Sous licence", reference_only: "Référence uniquement", unknown: "Droits à vérifier" };

export default function SourcesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", issuer: "MINEDUB", url: "", docType: "curriculum", usageRights: "unknown", publishedOn: "" });
  const [extract, setExtract] = useState<{ id: string; classLevel: string; subjectCode: string } | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["sources"], queryFn: () => api<{ items: Source[] }>("admin/sources?limit=100") });

  const create = useMutation({
    mutationFn: () => api("admin/sources", { method: "POST", body: { ...form, url: form.url || undefined, publishedOn: form.publishedOn || undefined } }),
    onSuccess: () => {
      toast.success("Source enregistrée");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["sources"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const runExtract = useMutation({
    mutationFn: () =>
      api("admin/ai/jobs", {
        method: "POST",
        body: {
          kind: "extract_source",
          params: { sourceId: extract!.id, classLevel: extract!.classLevel, subjectCode: extract!.subjectCode, subsystem: extract!.classLevel.startsWith("CLASS_") ? "anglophone" : "francophone", curriculumVersion: new Date().getFullYear() + "-01" },
        },
      }),
    onSuccess: () => {
      toast.success("Extraction lancée : les leçons apparaîtront « à valider » dans le référentiel");
      setExtract(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        eyebrow="Bibliothèque"
        title="Sources officielles"
        description="Seuls les domaines officiels en liste blanche peuvent être téléchargés. Chaque ressource publiée renvoie à sa source et à ses pages."
        actions={<BubbleButton tone="ink" onClick={() => setOpen(!open)}><Plus size={16} /> Ajouter</BubbleButton>}
      />

      {open && (
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="card mb-5 grid gap-4 p-6 sm:grid-cols-2 rise-in">
          <BubbleField label="Titre" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Programme officiel du niveau I" />
          <BubbleField label="Émetteur" required value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} />
          <BubbleField label="URL officielle" type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://www.minedub.cm/…" />
          <BubbleField label="Date de publication" value={form.publishedOn} onChange={(e) => setForm({ ...form, publishedOn: e.target.value })} placeholder="2025-09-01" />
          <Select label="Type" value={form.docType} onChange={(e) => setForm({ ...form, docType: e.target.value })}>
            <option value="curriculum">Programme</option><option value="calendar">Calendrier</option><option value="law">Texte de loi</option>
            <option value="textbook_list">Liste de manuels</option><option value="exam">Examen</option><option value="guide">Guide</option><option value="other">Autre</option>
          </Select>
          <Select label="Droits d'utilisation" value={form.usageRights} onChange={(e) => setForm({ ...form, usageRights: e.target.value })}>
            {Object.entries(RIGHTS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <BubbleButton type="button" onClick={() => setOpen(false)}>Annuler</BubbleButton>
            <BubbleButton tone="green" disabled={create.isPending}>Enregistrer</BubbleButton>
          </div>
        </form>
      )}

      {isLoading ? <Skeleton className="h-72" /> : !data?.items.length ? (
        <Empty title="Aucune source">Ajoute un programme officiel du MINEDUB pour commencer à construire le référentiel.</Empty>
      ) : (
        <ul className="card divide-y divide-[var(--line)]">
          {data.items.map((s) => (
            <li key={s._id} className="px-5 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-medium">{s.title}</p>
                  <p className="text-[12.5px] text-muted">{s.issuer} · {RIGHTS[s.usageRights]}{s.publishedOn ? ` · publié le ${s.publishedOn}` : ""}</p>
                </div>
                <Pill status={s.status === "verified" ? "validated" : s.status === "extracted" ? "extracted" : "DRAFT"}>{s.status}</Pill>
                {(s.url || s.fileUrl) && <a href={s.fileUrl ?? s.url} target="_blank" rel="noreferrer" className="bubble inline-flex h-9 w-9 items-center justify-center" aria-label="Ouvrir"><ExternalLink size={15} /></a>}
                <BubbleButton size="sm" onClick={() => setExtract({ id: s._id, classLevel: "CP", subjectCode: "MATH" })}><Wand2 size={14} /> Extraire</BubbleButton>
              </div>
              {extract?.id === s._id && (
                <div className="mt-3 flex flex-wrap items-end gap-3 rounded-2xl bg-[var(--surface-2)] p-4 shadow-[0_0_0_1px_var(--line)]">
                  <Select label="Classe" value={extract.classLevel} onChange={(e) => setExtract({ ...extract, classLevel: e.target.value })} className="w-40">
                    {CLASS_LEVELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </Select>
                  <BubbleField label="Code matière" value={extract.subjectCode} onChange={(e) => setExtract({ ...extract, subjectCode: e.target.value.toUpperCase() })} className="w-36" />
                  <BubbleButton tone="green" onClick={() => runExtract.mutate()} disabled={runExtract.isPending}>Lancer l'extraction</BubbleButton>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
