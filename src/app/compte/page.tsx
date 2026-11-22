import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, LayoutGrid, MailCheck } from "lucide-react";
import { PedagoWordmark } from "@/components/brand/PedagoMark";
import { DownloadCard } from "@/components/site/DownloadCard";
import { LogoutButton } from "@/components/site/LogoutButton";
import { getApk } from "@/lib/server/apk";
import { apkQr } from "@/lib/server/qr";
import { getSessionUser } from "@/lib/server/session";

export const metadata: Metadata = { title: "Mon espace", robots: { index: false, follow: false } };

/** Espace de l'utilisateur sur le site : son compte, et l'app à installer pour s'en servir. */
export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/connexion");
  const apk = getApk();
  const qr = await apkQr(apk);
  const first = user.fullName.split(" ")[0];
  return (
    <div className="site min-h-dvh">
      <div className="site-aurora" aria-hidden />
      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-5 py-6">
        <Link href="/" aria-label="Accueil PEDAGO">
          <PedagoWordmark />
        </Link>
        <LogoutButton />
      </header>
      <main className="relative z-10 mx-auto max-w-5xl px-5 pb-20 pt-6">
        <p className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-[#1F7A4D]">Mon espace</p>
        <h1 className="mt-3 text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[56px]">Bonjour {first}.</h1>
        <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-[#4a4a4a]">
          Ton compte est prêt. Installe l’app sur ton téléphone et connecte-toi avec <b className="font-semibold text-[#171717]">{user.email}</b> et ton mot de passe.
        </p>

        {!user.emailVerified && user.role === "teacher" && (
          <Link href="/inscription?etape=code" className="mt-6 flex items-center gap-3 rounded-[22px] bg-white/80 p-5 shadow-[0_0_0_1px_rgba(23,23,23,.08)]">
            <MailCheck size={22} className="shrink-0 text-[#1F7A4D]" />
            <span className="flex-1 text-[14.5px]">
              <b className="font-semibold">Confirme ton adresse e-mail</b> avec le code reçu, pour retrouver ton programme dans l’app.
            </span>
            <ArrowRight size={18} />
          </Link>
        )}

        {user.role !== "teacher" && (
          <Link href="/dashboard" className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-[#171717] px-6 text-[15px] font-semibold text-white">
            <LayoutGrid size={17} /> Ouvrir le tableau de bord
          </Link>
        )}

        <div className="mt-10">
          <DownloadCard apk={apk} qr={qr} />
        </div>
        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["Installe l’app", "Télécharge l’APK, autorise l’installation pour ton navigateur, puis touche « Installer »."],
            ["Connecte-toi", "Avec le même e-mail et le même mot de passe que sur ce site."],
            ["Ajoute ta classe", "Ta classe, tes matières et ton emploi du temps : ton programme du jour apparaît aussitôt."],
          ].map(([t, d], i) => (
            <li key={t} className="rounded-[24px] bg-white/80 p-6 shadow-[0_0_0_1px_rgba(23,23,23,.06)]">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#171717] text-[14px] font-semibold text-white">{i + 1}</span>
              <h2 className="mt-4 text-[17px] font-semibold">{t}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-[#5c5c5c]">{d}</p>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
