"use client";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api/proxy/${path.replace(/^\//, "")}`, {
    method: init.method ?? "GET",
    headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/connexion";
    throw new ApiError(401, "Session expirée");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.message ?? "Erreur");
  return data as T;
}

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  AI_CHECKED: "Contrôlé IA",
  HUMAN_REVIEW: "À relire",
  APPROVED: "Approuvé",
  PUBLISHED: "Publié",
  REJECTED: "Rejeté",
  ARCHIVED: "Archivé",
};

export const TYPE_LABELS: Record<string, string> = {
  lesson_plan: "Fiche de préparation",
  course_notes: "Notes de cours",
  written_trace: "Trace écrite",
  exercises: "Exercices",
  answer_key: "Corrigé",
  assessment: "Évaluation",
  composition: "Composition",
  exam: "Examen",
  grading_rubric: "Grille",
  illustration: "Illustrations",
  remediation: "Remédiation",
};

export const CLASS_LEVELS = [
  ["SIL", "SIL"], ["CP", "CP"], ["CE1", "CE1"], ["CE2", "CE2"], ["CM1", "CM1"], ["CM2", "CM2"],
  ["CLASS_1", "Class One"], ["CLASS_2", "Class Two"], ["CLASS_3", "Class Three"], ["CLASS_4", "Class Four"], ["CLASS_5", "Class Five"], ["CLASS_6", "Class Six"],
] as const;

export const JOB_STATUS: Record<string, string> = {
  queued: "En file",
  running: "En cours",
  waiting_review: "Attend relecture",
  done: "Terminé",
  failed: "Échec",
  cancelled: "Annulé",
  budget_exceeded: "Budget atteint",
};
