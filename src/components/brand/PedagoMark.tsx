/**
 * Monogramme PEDAGO : deux tuiles empilées (la tige du P) et un demi-disque vert (la panse),
 * qui évoque aussi une page ouverte. Aplat de couleur, sans dégradé ni identifiant : rendu serveur
 * identique au rendu navigateur, et aucun JavaScript nécessaire.
 */
export function PedagoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden>
      <rect x="2" y="2" width="17" height="17" rx="5" fill="var(--ink)" />
      <rect x="2" y="21" width="17" height="17" rx="5" fill="var(--ink)" opacity="0.72" />
      <path d="M21 2h4.5A12.5 12.5 0 0 1 38 14.5v0A12.5 12.5 0 0 1 25.5 27H21Z" fill="#1F7A4D" />
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
