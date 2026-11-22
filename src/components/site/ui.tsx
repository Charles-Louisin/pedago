"use client";

import { motion } from "motion/react";
import { useSyncExternalStore, type ReactNode } from "react";
import { Download } from "lucide-react";

export type SiteUser = { fullName: string; role: "teacher" | "reviewer" | "admin" } | null;

/** Courbe de signature (décélération douce) et durées : rapide · standard · lente. */
export const EASE = [0.16, 1, 0.3, 1] as const;
export const D = { quick: 0.35, base: 0.6, slow: 0.9 };

export const PRIMARY =
  "inline-flex h-14 items-center gap-2.5 rounded-full bg-[#171717] px-7 text-[16px] font-semibold text-white shadow-[0_14px_34px_-14px_rgba(23,23,23,.7)] transition-transform duration-300 hover:-translate-y-0.5 active:translate-y-0";
export const SECONDARY =
  "inline-flex h-14 items-center gap-2 rounded-full bg-white px-7 text-[16px] font-semibold text-[#171717] shadow-[0_0_0_1px_rgba(23,23,23,.1)] transition-transform duration-300 hover:-translate-y-0.5";

export const H2 = "text-[34px] font-semibold leading-[1.04] tracking-[-0.03em] [text-wrap:balance] sm:text-[50px]";

/** Apparition douce à l'entrée dans l'écran, une seule fois. */
export function Reveal({ children, delay = 0, className, y = 18 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-8% 0px" }} transition={{ duration: D.base, ease: EASE, delay }}>
      {children}
    </motion.div>
  );
}

/** Capture d'écran de l'app : image aux bords légèrement arrondis (voir .site-device). */
export function Device({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`site-device ${className ?? ""}`}>{children}</div>;
}

const noSubscribe = () => () => undefined;
export const useAndroid = () => useSyncExternalStore(noSubscribe, () => /Android/i.test(navigator.userAgent), () => false);

/** Aller à une ancre en douceur, sous la barre du haut (directement si les animations sont réduites). */
export function scrollToAnchor(target: string) {
  const el = document.querySelector(target);
  if (!el) return;
  const top = target === "#accueil" ? 0 : el.getBoundingClientRect().top + window.scrollY - 84;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
}

/** Bouton principal de téléchargement : APK direct sur Android, sinon la section avec QR code. */
export function DownloadButton({ apkUrl, className, label = "Télécharger gratuitement" }: { apkUrl: string | null; className: string; label?: string }) {
  const android = useAndroid();
  if (apkUrl && android) {
    return (
      <a href={apkUrl} download="PEDAGO.apk" className={className}>
        <Download size={18} /> {label}
      </a>
    );
  }
  return (
    <button type="button" onClick={() => scrollToAnchor("#telecharger")} className={className}>
      <Download size={18} /> {label}
    </button>
  );
}
