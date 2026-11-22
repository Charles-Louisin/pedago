import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Créer un compte",
  description: "Crée ton compte PEDAGO gratuitement, puis installe l’app sur ton téléphone Android.",
};

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
