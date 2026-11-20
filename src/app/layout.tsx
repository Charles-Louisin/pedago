import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/layout/Providers";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PEDAGO — Administration",
  description: "Bibliothèque pédagogique, relecture et validation des ressources PEDAGO.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
