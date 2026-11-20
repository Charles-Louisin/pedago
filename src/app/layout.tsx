import type { Metadata } from "next";
import { Providers } from "@/components/layout/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "PEDAGO — Administration",
  description: "Bibliothèque pédagogique, relecture et validation des ressources PEDAGO.",
  robots: { index: false, follow: false },
};

/** Applique le thème choisi avant le premier affichage (évite un flash clair en mode sombre). */
const themeScript = `try{var t=localStorage.getItem("pedago-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
