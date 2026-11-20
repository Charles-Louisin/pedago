import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/session";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/connexion");
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <Sidebar user={user} />
      <main className="min-w-0 px-5 pb-16 pt-8 lg:px-10">{children}</main>
    </div>
  );
}
