import type { Metadata } from "next";

export const metadata: Metadata = { title: "Se connecter", robots: { index: false, follow: true } };

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
