"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ExternalLink, Eye, Link2, Search, Upload, Wand2, X } from "lucide-react";
import { api, apiUpload, CLASS_LEVELS, SOURCE_STATUS } from "@/lib/api";
import { BubbleButton, BubbleField } from "@/components/ui/Bubble";
import { Empty, PageHeader, PdfFrame, Pill, Segmented, Select, Skeleton } from "@/components/ui/kit";

type Source = {
  _id: string;
  title: string;
  issuer: string;
  url?: string;
  fileUrl?: string;
  docType: string;
  usageRights: string;
  status: string;
  publishedOn?: string;
  consultedAt: string;
  pageCount?: number;
  notes?: string;
};

const RIGHTS: Record<string, string> = { public_official: "Texte officiel public", licensed: "Sous licence", reference_only: "Référence uniquement", unknown: "Droits à vérifier" };
const DOC_TYPES: [string, string][] = [
  ["curriculum", "Programme"],
  ["guide", "Guide pédagogique"],
  ["calendar", "Calendrier"],
  ["textbook_list", "Liste de manuels"],
  ["exam", "Examen"],
  ["law", "Texte réglementaire"],
  ["other", "Autre"],
];
const PILL: Record<string, string> = { verified: "validated", extracted: "extracted", rejected: "REJECTED" };
type Panel = null | "upload" | "link" | "research";

/**
 * Sources officielles : dépôt de PDF, ajout par lien (sites officiels en liste blanche) et recherche IA
 * de documents officiels. Tout ce qui arrive est « à vérifier » : un humain l'ouvre, le vérifie ou l'écarte,
 * puis lance l'extraction des leçons (elles-mêmes à valider dans le référentiel).
 */
export default function SourcesPage() {
  const qc = useQueryClient();
  const [panel, setPanel] = useState<Panel>(null);
  const [filter, setFilter] = useState<"todo" | "all">("todo");
  const [preview, setPreview] = useState<string | null>(null);
  const [meta, setMeta] = useState({ title: "", issuer: "MINEDUB", docType: "curriculum", usageRights: "public_official", publishedOn: "" });
  const [url, setUrl] = useState("");
  const [search, setSearch] = useState({ subsystem: "francophone", classLevel: "", subjectCode: "", topic: "" });
  const fileRef = useRef<HTMLInputElement>(null);
  const [extract, setExtract] = useState<{ id: string; classLevel: string; subjectCode: string } | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["sources"],
    queryFn: () => api<{ items: Source[] }>("admin/sources?limit=100"),
    // Une recherche IA ajoute des candidats en arrière-plan : la liste se rafraîchit seule.
    refetchInterval: 20_000,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["sources"] });
  const onError = (e: Error) => toast.error(e.message);

  const upload = useMutation({
    mutationFn: () => {
      const f = fileRef.current?.files?.[0];
      if (!f) throw new Error("Choisis un fichier PDF");
      const form = new FormData();
      for (const [k, v] of Object.entries(meta)) if (v) form.append(k, v);
      form.append("file", f);
      return apiUpload<Source & { textChars: number }>("admin/sources/upload", form);
    },
    onSuccess: (s) => {
      toast.success(s.textChars > 200 ? "Document déposé : texte lu, prêt à vérifier" : "Document déposé (scanné) : l'extraction lira les pages");
      setPanel(null);
      setMeta({ ...meta, title: "" });
      if (fileRef.current) fileRef.current.value = "";
      refresh();
    },
    onError,
  });
  const addLink = useMutation({
    mutationFn: () => api("admin/sources", { method: "POST", body: { title: meta.title, issuer: meta.issuer, docType: meta.docType, usageRights: meta.usageRights, url, publishedOn: meta.publishedOn || undefined } }),
    onSuccess: () => {
      toast.success("Lien enregistré, à vérifier");
      setPanel(null);
      setUrl("");
      refresh();
    },
    onError,
  });
  const research = useMutation({
    mutationFn: () =>
      api("admin/ai/jobs", {
        method: "POST",
        body: {
          kind: "research_sources",
          params: { subsystem: search.subsystem, classLevel: search.classLevel || undefined, subjectCode: search.subjectCode || undefined, topic: search.topic || undefined },
        },
      }),
    onSuccess: () => {
      toast.success("Recherche lancée : les documents trouvés arriveront ici « à vérifier »");
      setPanel(null);
    },
    onError,
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api(`admin/sources/${id}`, { method: "PATCH", body: { status } }),
    onSuccess: (_d, v) => {
      toast.success(v.status === "verified" ? "Source vérifiée" : "Source écartée");
      refresh();
    },
    onError,
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
    onError,
  });

  const items = (data?.items ?? []).filter((s) => filter === "all" || !["verified", "rejected"].includes(s.status));
  const metaFields = (
    <>
      <BubbleField label="Titre" required value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} placeholder="Programme officiel du niveau II" />
      <BubbleField label="Émetteur" required value={meta.issuer} onChange={(e) => setMeta({ ...meta, issuer: e.target.value })} />
      <Select label="Type" value={meta.docType} onChange={(e) => setMeta({ ...meta, docType: e.target.value })}>
        {DOC_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </Select>
      <Select label="Droits d'utilisation" value={meta.usageRights} onChange={(e) => setMeta({ ...meta, usageRights: e.target.value })}>
        {Object.entries(RIGHTS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </Select>
      <BubbleField label="Date de publication" value={meta.publishedOn} onChange={(e) => setMeta({ ...meta, publishedOn: e.target.value })} placeholder="2025-09-01" />
    </>
  );

  return (
    <>
      <PageHeader
        eyebrow="Bibliothèque"
        title="Sources officielles"
        description="Dépose les documents officiels, ajoute un lien d'un site officiel ou lance une recherche. Tout arrive « à vérifier » : ouvre le document, vérifie-le, puis extrais les leçons."
        actions={
          <div className="flex flex-wrap gap-2">
            <BubbleButton tone="ink" onClick={() => setPanel(panel === "upload" ? null : "upload")}><Upload size={16} /> Déposer un PDF</BubbleButton>
            <BubbleButton onClick={() => setPanel(panel === "link" ? null : "link")}><Link2 size={16} /> Lien officiel</BubbleButton>
            <BubbleButton onClick={() => setPanel(panel === "research" ? null : "research")}><Search size={16} /> Rechercher</BubbleButton>
          </div>
        }
      />

      {panel === "upload" && (
        <form onSubmit={(e) => { e.preventDefault(); upload.mutate(); }} className="card mb-5 grid gap-4 p-6 sm:grid-cols-2 rise-in">
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-[12.5px] font-medium text-muted">Fichier PDF (30 Mo au plus)</span>
            <input ref={fileRef} type="file" accept="application/pdf" required className="block w-full rounded-2xl bg-[var(--surface-2)] p-3 text-[13.5px] shadow-[0_0_0_1px_var(--line)] file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-1.5 file:text-[13px] file:font-medium file:text-[var(--canvas)]" />
          </label>
          {metaFields}
          <div className="flex items-end justify-end gap-2">
            <BubbleButton type="button" onClick={() => setPanel(null)}>Annuler</BubbleButton>
            <BubbleButton tone="ink" disabled={upload.isPending}>{upload.isPending ? "Envoi…" : "Déposer"}</BubbleButton>
          </div>
        </form>
      )}

      {panel === "link" && (
        <form onSubmit={(e) => { e.preventDefault(); addLink.mutate(); }} className="card mb-5 grid gap-4 p-6 sm:grid-cols-2 rise-in">
          <BubbleField label="Lien officiel" type="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.minedub.cm/…" className="sm:col-span-2" />
          {metaFields}
          <div className="flex items-end justify-end gap-2">
            <BubbleButton type="button" onClick={() => setPanel(null)}>Annuler</BubbleButton>
            <BubbleButton tone="ink" disabled={addLink.isPending}>Enregistrer</BubbleButton>
          </div>
        </form>
      )}

      {panel === "research" && (
        <form onSubmit={(e) => { e.preventDefault(); research.mutate(); }} className="card mb-5 grid gap-4 p-6 sm:grid-cols-2 rise-in">
          <p className="text-[13.5px] text-muted sm:col-span-2">
            L’IA cherche sur le web les programmes, guides, calendriers et listes de manuels officiels. Seuls les liens des sites officiels en liste blanche sont gardés, et chacun arrive « à vérifier ».
          </p>
          <Select label="Sous-système" value={search.subsystem} onChange={(e) => setSearch({ ...search, subsystem: e.target.value })}>
            <option value="francophone">Francophone</option>
            <option value="anglophone">Anglophone</option>
          </Select>
          <Select label="Classe" value={search.classLevel} onChange={(e) => setSearch({ ...search, classLevel: e.target.value })}>
            <option value="">Toutes</option>
            {CLASS_LEVELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <BubbleField label="Code matière (facultatif)" value={search.subjectCode} onChange={(e) => setSearch({ ...search, subjectCode: e.target.value.toUpperCase() })} placeholder="MATH" />
          <BubbleField label="Précision (facultatif)" value={search.topic} onChange={(e) => setSearch({ ...search, topic: e.target.value })} placeholder="calendrier scolaire 2026-2027" />
          <div className="flex justify-end gap-2 sm:col-span-2">
            <BubbleButton type="button" onClick={() => setPanel(null)}>Annuler</BubbleButton>
            <BubbleButton tone="ink" disabled={research.isPending}><Search size={15} /> Lancer la recherche</BubbleButton>
          </div>
        </form>
      )}

      <div className="mb-3 flex items-center justify-between gap-3">
        <Segmented value={filter} onChange={setFilter} options={[{ value: "todo", label: "À traiter" }, { value: "all", label: "Toutes" }]} />
        <span className="text-[12.5px] text-muted">{items.length} document{items.length > 1 ? "s" : ""}</span>
      </div>

      {isLoading ? (
        <Skeleton className="h-72" />
      ) : !items.length ? (
        <Empty title={filter === "todo" ? "Rien à traiter" : "Aucune source"}>Dépose un programme officiel du MINEDUB ou lance une recherche pour commencer.</Empty>
      ) : (
        <ul className="card divide-y divide-[var(--line)]">
          {items.map((s) => (
            <li key={s._id} className="px-5 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-medium">{s.title}</p>
                  <p className="text-[12.5px] text-muted">
                    {s.issuer} · {DOC_TYPES.find(([v]) => v === s.docType)?.[1] ?? s.docType} · {RIGHTS[s.usageRights]}
                    {s.pageCount ? ` · ${s.pageCount} p.` : ""}
                    {s.publishedOn ? ` · publié le ${s.publishedOn}` : ""}
                  </p>
                  {s.notes && <p className="mt-1 text-[12.5px] text-muted">{s.notes}</p>}
                </div>
                <Pill status={PILL[s.status] ?? "DRAFT"}>{SOURCE_STATUS[s.status] ?? s.status}</Pill>
                {s.fileUrl ? (
                  <BubbleButton size="sm" onClick={() => setPreview(preview === s._id ? null : s._id)}><Eye size={14} /> {preview === s._id ? "Fermer" : "Voir"}</BubbleButton>
                ) : (
                  /^https:\/\//.test(s.url ?? "") && <a href={s.url} target="_blank" rel="noreferrer noopener" className="bubble inline-flex h-9 items-center gap-1.5 px-3 text-[13px]" aria-label="Ouvrir le lien officiel"><ExternalLink size={14} /> Ouvrir</a>
                )}
                {!["verified", "rejected"].includes(s.status) && (
                  <>
                    <BubbleButton size="sm" onClick={() => setStatus.mutate({ id: s._id, status: "verified" })}><Check size={14} /> Vérifiée</BubbleButton>
                    <BubbleButton size="sm" onClick={() => setStatus.mutate({ id: s._id, status: "rejected" })} aria-label="Écarter"><X size={14} /></BubbleButton>
                  </>
                )}
                {s.status !== "rejected" && <BubbleButton size="sm" onClick={() => setExtract({ id: s._id, classLevel: "CP", subjectCode: "MATH" })}><Wand2 size={14} /> Extraire</BubbleButton>}
              </div>
              {preview === s._id && <PdfFrame className="mt-4" src={`/api/proxy/admin/sources/${s._id}/file`} title={s.title} />}
              {extract?.id === s._id && (
                <div className="mt-3 flex flex-wrap items-end gap-3 rounded-2xl bg-[var(--surface-2)] p-4 shadow-[0_0_0_1px_var(--line)]">
                  <Select label="Classe" value={extract.classLevel} onChange={(e) => setExtract({ ...extract, classLevel: e.target.value })} className="w-40">
                    {CLASS_LEVELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </Select>
                  <BubbleField label="Code matière" value={extract.subjectCode} onChange={(e) => setExtract({ ...extract, subjectCode: e.target.value.toUpperCase() })} className="w-36" />
                  <BubbleButton tone="ink" onClick={() => runExtract.mutate()} disabled={runExtract.isPending}>Lancer l’extraction</BubbleButton>
                  <BubbleButton onClick={() => setExtract(null)}>Annuler</BubbleButton>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
