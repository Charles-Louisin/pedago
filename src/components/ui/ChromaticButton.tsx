"use client";

import { ArrowUp } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

/**
 * Bouton chromatique : sphère au dégradé fluide (magenta → violet → bleu) qui tourne lentement,
 * avec reflet sphérique. Utilisé pour l'action principale « lancer » (ex. lancer une tâche IA).
 */
export function ChromaticOrbButton({ size = 52, label, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { size?: number; label: string }) {
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      className="group relative shrink-0 overflow-hidden rounded-full transition-transform duration-300 hover:scale-105 active:scale-95 disabled:opacity-40"
      style={{ width: size, height: size, boxShadow: "0 10px 24px -10px rgba(194,28,180,.7), inset 0 0 0 1px rgba(255,255,255,.25)" }}
    >
      <span
        className="absolute inset-[-40%] animate-[spin_6s_linear_infinite]"
        style={{ background: "conic-gradient(from 0deg,#ff2bd6,#8a2be2,#2f6fed,#ff5ea8,#ff2bd6)" }}
      />
      <span className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(70% 60% at 35% 25%,rgba(255,255,255,.75),rgba(255,255,255,0) 55%)" }} />
      <span className="absolute inset-0 rounded-full" style={{ boxShadow: "inset 0 -6px 12px rgba(60,0,80,.45)" }} />
      <ArrowUp className="relative mx-auto text-white drop-shadow" size={size * 0.42} strokeWidth={2.4} />
    </button>
  );
}

/** Barre de saisie en pilule + sphère chromatique (comme le composant Chromatic Button). */
export function ChromaticPrompt({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="bubble-field flex h-16 items-center gap-3 pl-6 pr-2"
    >
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-transparent text-[15px] outline-none placeholder:text-faint" />
      <ChromaticOrbButton type="submit" label="Lancer" size={48} disabled={disabled} />
    </form>
  );
}
