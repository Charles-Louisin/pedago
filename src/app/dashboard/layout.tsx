import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/session";
import { Sidebar } from "@/components/layout/Sidebar";

export const metadata: Metadata = { title: "Tableau de bord", robots: { index: false, follow: false } };

/**
 * Tableau de bord : réservé à l'équipe (rôle donné par un administrateur). Un utilisateur connecté
 * retourne à son espace ; l'équipe doit avoir validé sa double authentification.
 */
export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/connexion");
  if (user.role === "teacher") redirect("/compte");
  if (!user.mfa) redirect("/securite");
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <Sidebar user={user} />
      <main className="min-w-0 px-5 pb-16 pt-8 lg:px-10">{children}</main>
    </div>
  );
}
