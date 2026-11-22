"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { BubbleButton } from "@/components/ui/Bubble";

/**
 * Confirmation avant une action qui ne se rattrape pas (déconnexion, suppression…) :
 * fenêtre centrée sur fond assombri ; « Échap » ou un clic sur le fond annulent ; le bouton
 * principal reçoit le focus pour valider au clavier. Rendue dans <body> (portail) : un parent qui crée
 * son propre plan d'empilement (en-tête en z-10, carte en verre…) ne peut pas la recouvrir.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  danger,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
      <button aria-label="Annuler" className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby={message ? "confirm-message" : undefined} className="card relative w-full max-w-sm p-6 rise-in">
        <h2 id="confirm-title" className="text-[17px] font-semibold">{title}</h2>
        {message && <p id="confirm-message" className="mt-2 text-[14px] leading-relaxed text-muted">{message}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <BubbleButton type="button" onClick={onCancel}>Annuler</BubbleButton>
          <BubbleButton autoFocus type="button" tone={danger ? "red" : "ink"} onClick={onConfirm} disabled={busy}>{confirmLabel}</BubbleButton>
        </div>
      </div>
    </div>,
    document.body
  );
}
