"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { BubbleSwitch } from "@/components/ui/Bubble";
import { PageHeader, Skeleton } from "@/components/ui/kit";

type U = { _id: string; fullName: string; email?: string; phone?: string; role: string; disabled: boolean; mfaEnabled?: boolean; lastLoginAt?: string };

export default function UsersPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["users"], queryFn: () => api<{ items: U[]; total: number }>("admin/users?limit=100") });
  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<U> & { resetMfa?: true } }) => api(`admin/users/${id}`, { method: "PATCH", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader eyebrow="Administration" title="Utilisateurs" description="Rôles : enseignant (app mobile), relecteur (validation), administrateur (publication, IA)." />
      {isLoading ? <Skeleton className="h-80" /> : (
        <ul className="card divide-y divide-[var(--line)]">
          {data?.items.map((u) => (
            <li key={u._id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/[.06] text-[13px] font-semibold">{u.fullName.slice(0, 1)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium">{u.fullName}</p>
                <p className="text-[12.5px] text-muted">{u.email ?? u.phone}{u.lastLoginAt ? ` · vu le ${new Date(u.lastLoginAt).toLocaleDateString("fr-FR")}` : ""}</p>
              </div>
              <select value={u.role} onChange={(e) => patch.mutate({ id: u._id, body: { role: e.target.value } })} className="bubble-field h-9 px-3 text-[13px] outline-none" aria-label="Rôle">
                <option value="teacher">Enseignant</option><option value="reviewer">Relecteur</option><option value="admin">Administrateur</option>
              </select>
              {u.role !== "teacher" && (
                <span className="flex items-center gap-2 text-[12.5px]">
                  <span className={u.mfaEnabled ? "text-green" : "text-red"}>{u.mfaEnabled ? "2FA active" : "2FA à activer"}</span>
                  {u.mfaEnabled && (
                    <button
                      type="button"
                      className="font-medium text-muted underline-offset-2 hover:underline"
                      onClick={() => {
                        if (window.confirm(`Réinitialiser la double authentification de ${u.fullName} ? Ses sessions seront fermées.`)) patch.mutate({ id: u._id, body: { resetMfa: true } });
                      }}
                    >
                      Réinitialiser
                    </button>
                  )}
                </span>
              )}
              <span className="flex items-center gap-2 text-[12.5px] text-muted">
                Actif <BubbleSwitch label="Compte actif" checked={!u.disabled} onChange={(v) => patch.mutate({ id: u._id, body: { disabled: !v } })} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
