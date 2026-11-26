"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { BubbleSwitch } from "@/components/ui/Bubble";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader, Skeleton } from "@/components/ui/kit";

type U = { _id: string; fullName: string; email?: string; phone?: string; role: string; disabled: boolean; mfaEnabled?: boolean; lastLoginAt?: string };
type Patch = { role?: string; disabled?: boolean; resetMfa?: true };
type Pending = { user: U; title: string; message: string; confirm: string; danger?: boolean; body: Patch; done: string } | null;

const ROLE: Record<string, string> = { teacher: "Enseignant", admin: "Administrateur" };

export default function UsersPage() {
  const qc = useQueryClient();
  const [ask, setAsk] = useState<Pending>(null);
  const { data, isLoading } = useQuery({ queryKey: ["users"], queryFn: () => api<{ items: U[]; total: number }>("admin/users?limit=100") });
  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Patch; done?: string }) => api(`admin/users/${id}`, { method: "PATCH", body }),
    onSuccess: (_d, v) => {
      if (v.done) toast.success(v.done);
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  // Changement qui ferme les sessions de la personne : toujours confirmé avant.
  const confirmPatch = (p: NonNullable<Pending>) => setAsk(p);

  return (
    <>
      <PageHeader eyebrow="Administration" title="Utilisateurs" description="Tout nouveau compte est un utilisateur (enseignant). Toi seul nommes un administrateur : il relit, valide et publie les contenus, pilote l’IA et le tableau de bord." />

      {isLoading ? (
        <Skeleton className="h-80" />
      ) : (
        <ul className="card divide-y divide-[var(--line)]">
          {data?.items.map((u) => (
            <li key={u._id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/[.06] text-[13px] font-semibold">{u.fullName.slice(0, 1)}</span>
              <div className="min-w-0 flex-1 basis-48">
                <p className="truncate text-[14px] font-medium">{u.fullName}</p>
                <p className="truncate text-[12.5px] text-muted" title={u.email ?? u.phone ?? ""}>
                  {u.email ?? u.phone}
                  {u.lastLoginAt ? ` · vu le ${new Date(u.lastLoginAt).toLocaleDateString("fr-FR")}` : ""}
                </p>
              </div>
              <select
                value={u.role}
                onChange={(e) => {
                  const role = e.target.value;
                  confirmPatch({ user: u, title: `Rôle de ${u.fullName} : ${ROLE[role]} ?`, message: "Ses sessions ouvertes seront fermées : la personne se reconnectera avec ses nouveaux droits.", confirm: "Changer le rôle", body: { role }, done: `Rôle modifié : ${ROLE[role]}` });
                }}
                className="bubble-field h-9 px-3 text-[13px] outline-none"
                aria-label={`Rôle de ${u.fullName}`}
              >
                <option value="teacher">Enseignant</option>
                <option value="admin">Administrateur</option>
              </select>
              {u.role !== "teacher" && (
                <span className="flex items-center gap-2 text-[12.5px]">
                  <span className={u.mfaEnabled ? "text-ink" : "text-red"}>{u.mfaEnabled ? "2FA active" : "2FA à activer"}</span>
                  {u.mfaEnabled && (
                    <button
                      type="button"
                      className="font-medium text-muted underline-offset-2 hover:underline"
                      onClick={() => confirmPatch({ user: u, title: `Réinitialiser la double authentification de ${u.fullName} ?`, message: "Ses sessions seront fermées ; elle réactivera la double authentification à sa prochaine connexion.", confirm: "Réinitialiser", danger: true, body: { resetMfa: true }, done: "Double authentification réinitialisée" })}
                    >
                      Réinitialiser
                    </button>
                  )}
                </span>
              )}
              <span className="flex items-center gap-2 text-[12.5px] text-muted">
                Actif
                <BubbleSwitch
                  label={`Compte de ${u.fullName} actif`}
                  checked={!u.disabled}
                  onChange={(v) =>
                    v
                      ? patch.mutate({ id: u._id, body: { disabled: false }, done: "Compte réactivé" })
                      : confirmPatch({ user: u, title: `Désactiver le compte de ${u.fullName} ?`, message: "La personne est déconnectée partout et ne peut plus se connecter tant que le compte est désactivé.", confirm: "Désactiver", danger: true, body: { disabled: true }, done: "Compte désactivé" })
                  }
                />
              </span>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!ask}
        title={ask?.title ?? ""}
        message={ask?.message}
        confirmLabel={ask?.confirm ?? "Confirmer"}
        danger={ask?.danger}
        busy={patch.isPending}
        onCancel={() => setAsk(null)}
        onConfirm={() => {
          if (!ask) return;
          patch.mutate({ id: ask.user._id, body: ask.body, done: ask.done }, { onSettled: () => setAsk(null) });
        }}
      />
    </>
  );
}
