"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/** Déconnexion du site, toujours confirmée. */
export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className ?? "bubble inline-flex h-11 items-center gap-2 px-5 text-[14px] font-semibold"}>
        <LogOut size={16} /> Se déconnecter
      </button>
      <ConfirmDialog
        open={open}
        title="Se déconnecter ?"
        message="Tu pourras te reconnecter avec ton e-mail et ton mot de passe."
        confirmLabel={busy ? "Déconnexion…" : "Se déconnecter"}
        busy={busy}
        onCancel={() => setOpen(false)}
        onConfirm={async () => {
          setBusy(true);
          await fetch("/api/session", { method: "DELETE" });
          router.replace("/");
          router.refresh();
        }}
      />
    </>
  );
}
