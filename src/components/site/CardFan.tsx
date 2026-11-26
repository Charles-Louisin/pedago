"use client";

import { AnimatePresence, motion, useInView, useReducedMotion, type PanInfo } from "motion/react";
import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import { EASE } from "./ui";

/** Vrais écrans de l'app (nouvelle version) : images et courtes vidéos d'un seul geste. */
export const SHOTS = [
  { kind: "image", src: "accueil", label: "Aujourd’hui", text: "La leçon du moment et ta journée" },
  { kind: "video", src: "v-ouvrir", label: "Ouvrir la leçon", text: "Un geste, et la fiche s’affiche" },
  { kind: "image", src: "lecteur", label: "La fiche", text: "Prête à imprimer, au format A4" },
  { kind: "video", src: "v-fait", label: "Le bilan", text: "« Fait » : la journée avance" },
  { kind: "image", src: "illustrations", label: "Illustrations", text: "Une image sur mesure pour ta fiche" },
  { kind: "video", src: "v-programme", label: "Programme", text: "Le mois en un coup d’œil" },
  { kind: "image", src: "semaine", label: "Ma semaine", text: "Les fiches des 7 prochains jours" },
  { kind: "video", src: "v-telecharger", label: "Tout télécharger", text: "Ta semaine, même sans réseau" },
  { kind: "image", src: "bibliotheque", label: "Bibliothèque", text: "Toutes les ressources de ta classe" },
  { kind: "image", src: "menu", label: "Actions", text: "Imprimer, adapter, reporter" },
  { kind: "image", src: "programme", label: "Calendrier", text: "Ce qui est fait, ce qui vient" },
  { kind: "image", src: "sombre", label: "Mode sombre", text: "Comme ton téléphone" },
] as const;
type Shot = (typeof SHOTS)[number];
export const N = SHOTS.length;
export const wrap = (i: number) => ((i % N) + N) % N;
const poster = (s: Shot) => `/site/app/${s.src}.${s.kind === "video" ? "png" : "jpg"}`;
/** Écart circulaire entre deux cartes, entre -N/2 et N/2. */
const gap = (i: number, a: number) => ((((i - a) % N) + N + Math.floor(N / 2)) % N) - Math.floor(N / 2);
/** Distance de glissement (px) au-delà de laquelle on change de carte. */
const SWIPE = 40;

/**
 * Image ou vidéo. La vidéo reste montée (pas de clignotement quand elle passe devant) : elle joue quand
 * `playing`, se met en pause sinon, et repart du début dès qu'elle se termine.
 */
function Media({ shot, playing, className }: { shot: Shot; playing: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (playing) {
      v.currentTime = 0;
      void v.play().catch(() => undefined);
    } else v.pause();
  }, [playing]);
  if (shot.kind === "video") {
    return (
      <video
        ref={ref}
        src={`/site/app/${shot.src}.webm`}
        poster={poster(shot)}
        muted
        loop
        playsInline
        preload="metadata"
        onEnded={(e) => {
          // Sécurité si la boucle native ne repart pas (certains WebM) : on relance à la main.
          e.currentTarget.currentTime = 0;
          void e.currentTarget.play().catch(() => undefined);
        }}
        draggable={false}
        className={className}
        aria-label={`Vidéo : ${shot.label}`}
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={poster(shot)} alt={`Écran de l’app : ${shot.label}`} decoding="async" draggable={false} className={className} />;
}

/**
 * Éventail de cartes (pied de page). La carte de devant est « mise en avant » (sa vidéo joue) ;
 * toucher une carte de côté la fait venir devant, toucher celle de devant l'agrandit.
 * On peut aussi glisser à gauche ou à droite.
 */
export function CardFan({ onOpen, active, setActive }: { onOpen: (i: number) => void; active: number; setActive: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const reduce = useReducedMotion();
  const open = inView || reduce;
  // Glissement au doigt ou à la souris : on retient le départ ; un vrai glissement annule le clic qui suit.
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const onDown = (e: RPointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY };
    swiped.current = false;
  };
  const onUp = (e: RPointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(e.clientY - s.y)) {
      swiped.current = true;
      setActive(wrap(active + (dx < 0 ? 1 : -1)));
    }
  };
  return (
    <div
      ref={ref}
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerCancel={() => (start.current = null)}
      className="relative h-full w-full touch-pan-y select-none"
      role="group"
      aria-roledescription="carrousel"
      aria-label="Écrans de l’app"
    >
      {SHOTS.map((s, i) => {
        const k = gap(i, active);
        const far = Math.abs(k) > 3;
        const front = k === 0;
        return (
          <motion.div
            key={s.src}
            className="absolute left-1/2 top-1/2 -ml-[calc(var(--card)/2)] -mt-[calc(var(--card)*1.082)] aspect-[390/844] w-[var(--card)] will-change-transform"
            initial={false}
            animate={{
              x: open ? `calc(${k} * var(--spread))` : "0px",
              y: open ? Math.abs(k) * 10 + (front ? -6 : 0) : 40,
              rotate: open ? k * 8 : 0,
              scale: front ? 1 : 1 - Math.min(Math.abs(k), 3) * 0.05,
              opacity: open ? (far ? 0 : 1) : 0,
            }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 210, damping: 30, mass: 0.8 }}
            style={{ zIndex: 20 - Math.abs(k), pointerEvents: far ? "none" : "auto" }}
          >
            <button
              type="button"
              onClick={() => {
                if (swiped.current) return;
                if (front) onOpen(i);
                else setActive(i);
              }}
              aria-label={front ? `Agrandir : ${s.label}` : `Mettre en avant : ${s.label}`}
              aria-current={front ? "true" : undefined}
              tabIndex={far ? -1 : 0}
              className={`relative block h-full w-full overflow-hidden rounded-[22px] bg-[#1E1C1A] ring-[5px] ring-[#151515] transition-shadow duration-500 sm:rounded-[28px] sm:ring-[7px] ${front ? "cursor-zoom-in shadow-[0_40px_80px_-30px_rgba(0,0,0,.9)]" : "shadow-[0_20px_50px_-30px_rgba(0,0,0,.9)]"}`}
            >
              <Media shot={s} playing={front && open === true} className="pointer-events-none h-full w-full object-cover" />
              {s.kind === "video" && !front && (
                <span className="absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur">
                  <Play size={13} fill="currentColor" className="translate-x-px" />
                </span>
              )}
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}

/** Nom et description de l'écran mis en avant, toujours sous l'image (jamais par-dessus). */
export function Caption({ index, className }: { index: number; className?: string }) {
  const s = SHOTS[index];
  return (
    <div className={`relative h-[46px] overflow-hidden text-center ${className ?? ""}`} aria-live="polite">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div key={s.src} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.35, ease: EASE }}>
          <p className="text-[15px] font-bold text-white">{s.label}</p>
          <p className="mt-0.5 text-[13px] text-white/60">
            {s.text} · {index + 1}/{N}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Visionneuse : cadre de taille fixe au centre, flèches de côté, légende dessous ; fermer (bouton, Échap, clic dans le vide). */
export function Lightbox({ index, onClose, onMove }: { index: number | null; onClose: () => void; onMove: (dir: 1 | -1) => void }) {
  const [dir, setDir] = useState<1 | -1>(1);
  const move = useCallback(
    (d: 1 | -1) => {
      setDir(d);
      onMove(d);
    },
    [onMove]
  );
  const open = index !== null;
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, move]);
  if (typeof document === "undefined") return null;
  const shot = open ? SHOTS[index] : null;
  const side = "grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 backdrop-blur-md transition-[background-color,transform] duration-200 hover:scale-105 hover:bg-white/20 active:scale-95";
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > SWIPE * 1.5) move(info.offset.x < 0 ? 1 : -1);
  };
  return createPortal(
    <AnimatePresence>
      {shot && (
        <motion.div
          key="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Écran : ${shot.label}`}
          className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-5 bg-[#0c0c0b]/80 px-4 [font-family:var(--font-jakarta),system-ui,sans-serif] backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: EASE }}
          onClick={onClose}
        >
          <button type="button" onClick={onClose} aria-label="Fermer" className={`${side} absolute right-4 top-4 sm:right-6 sm:top-6`}>
            <X size={20} />
          </button>
          <div className="flex items-center gap-3 sm:gap-8">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                move(-1);
              }}
              aria-label="Écran précédent"
              className={side}
            >
              <ChevronLeft size={22} />
            </button>
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className="relative aspect-[390/844] w-[min(calc(min(72svh,720px)*390/844),calc(100vw-140px))] overflow-hidden rounded-[30px] bg-[#1E1C1A] shadow-[0_50px_120px_-30px_rgba(0,0,0,.9)] ring-[8px] ring-[#151515]"
            >
              <AnimatePresence initial={false} custom={dir}>
                <motion.div
                  key={shot.src}
                  custom={dir}
                  variants={{
                    in: (d: number) => ({ x: `${d * 100}%` }),
                    on: { x: "0%" },
                    out: (d: number) => ({ x: `${d * -100}%` }),
                  }}
                  initial="in"
                  animate="on"
                  exit="out"
                  transition={{ duration: 0.45, ease: EASE }}
                  drag="x"
                  dragSnapToOrigin
                  dragElastic={0.25}
                  onDragEnd={onDragEnd}
                  className="absolute inset-0 cursor-grab active:cursor-grabbing"
                >
                  <Media shot={shot} playing className="pointer-events-none h-full w-full object-cover" />
                </motion.div>
              </AnimatePresence>
            </motion.div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                move(1);
              }}
              aria-label="Écran suivant"
              className={side}
            >
              <ChevronRight size={22} />
            </button>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <Caption index={index ?? 0} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
