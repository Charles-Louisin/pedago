import type { Metadata } from "next";
import { SiteIntro, SiteIntroLanding } from "@/components/brand/BrandLoader";
import { Site } from "@/components/site/Site";
import { DownloadCard } from "@/components/site/DownloadCard";
import { getApk } from "@/lib/server/apk";
import { getSiteMedia } from "@/lib/server/site-media";
import { apkQr } from "@/lib/server/qr";
import { getSessionUser } from "@/lib/server/session";

export const metadata: Metadata = {
  title: "PEDAGO — Ta classe prête chaque matin",
  description: "La leçon du moment, sa fiche prête à imprimer et ton bilan en un geste, même sans réseau. Pour les enseignants du primaire au Cameroun, francophone et anglophone.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "PEDAGO — Ta classe prête chaque matin",
    description: "L’assistant de classe des enseignants du primaire au Cameroun. Francophone et anglophone.",
    images: [{ url: "/site/photos/enseignante.jpg", width: 2400, height: 3600 }],
    locale: "fr_FR",
    type: "website",
  },
};

/** Site public : présentation, démonstrations, téléchargement de l'app ; bouton vers l'espace de chacun. */
export default async function Home() {
  const [user, apk, film] = await Promise.all([getSessionUser(), Promise.resolve(getApk()), getSiteMedia("film")]);
  const qr = await apkQr(apk);
  return (
    <>
      <SiteIntro />
      <Site user={user ? { fullName: user.fullName, role: user.role } : null} apkUrl={apk?.url ?? null} downloadCard={<DownloadCard apk={apk} qr={qr} />} film={film} />
      <SiteIntroLanding />
    </>
  );
}
