import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/layout/Providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: { default: "PEDAGO", template: "%s — PEDAGO" },
  description: "L’assistant de classe des enseignants du primaire au Cameroun.",
};

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
// Titres du site : Bricolage Grotesque, comme les titres de l’app (axe de largeur pour les très grands mots du pied de page).
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: "variable", axes: ["wdth", "opsz"], variable: "--font-bricolage", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-jakarta", display: "swap" });

/** Applique le thème choisi avant le premier affichage (évite un flash clair en mode sombre). */
const themeScript = `try{var t=localStorage.getItem("pedago-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${inter.variable} ${jakarta.variable} ${bricolage.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
