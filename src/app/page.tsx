import type { Metadata } from "next";
import { Site } from "@/components/site/Site";
import { DownloadCard } from "@/components/site/DownloadCard";
import { getApk } from "@/lib/server/apk";
import { apkQr } from "@/lib/server/qr";
import { getSessionUser } from "@/lib/server/session";

export const metadata: Metadata = {
  title: "PEDAGO — Prépare ta classe en une photo",
  description: "Photographie ta fiche : PEDAGO la recopie à l’identique, l’adapte au niveau de ta classe, l’imprime et tient ton programme à jour, même sans connexion. Gratuit pour les enseignants du primaire au Cameroun.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "PEDAGO — Prépare ta classe en une photo",
    description: "L’assistant de classe des enseignants du primaire au Cameroun. Gratuit, hors connexion, francophone et anglophone.",
    images: [{ url: "/site/screens/fiche-a4.jpg", width: 1280, height: 1810 }],
    locale: "fr_FR",
    type: "website",
  },
};

/** Site public : présentation, démonstrations, téléchargement de l'app ; bouton vers l'espace de chacun. */
export default async function Home() {
  const [user, apk] = await Promise.all([getSessionUser(), Promise.resolve(getApk())]);
  const qr = await apkQr(apk);
  return <Site user={user ? { fullName: user.fullName, role: user.role } : null} apkUrl={apk?.url ?? null} downloadCard={<DownloadCard apk={apk} qr={qr} />} />;
}
