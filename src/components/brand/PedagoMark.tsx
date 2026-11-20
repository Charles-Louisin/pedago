"use client";

import { useId } from "react";

/**
 * Monogramme PEDAGO : deux tuiles empilées (la tige du P) et un demi-disque (la panse),
 * qui évoque aussi une page ouverte. Identifiants de dégradés uniques par instance
 * (sinon une copie masquée en CSS « vole » les dégradés et le logo disparaît).
 */
export function PedagoMark({ size = 28, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0b8a55" />
          <stop offset="1" stopColor="#34c759" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="17" height="17" rx="5" fill="var(--ink)" />
      <rect x="2" y="21" width="17" height="17" rx="5" fill="var(--ink)" opacity="0.72" />
      <path d="M21 2h4.5A12.5 12.5 0 0 1 38 14.5v0A12.5 12.5 0 0 1 25.5 27H21Z" fill={`url(#${id}b)`} />
    </svg>
  );
}

export function PedagoWordmark({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <PedagoMark size={22} />
      <span className="text-[15px] font-semibold tracking-[-0.02em]">pedago</span>
    </span>
  );
}
