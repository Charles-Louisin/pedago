"use client";

import { useEffect, useState } from "react";

/**
 * Loader d'entrée (recréé image par image depuis l'intro de ReactDrops, adapté à PEDAGO) :
 * 1. un petit carré gris apparaît et grandit, 2. des lignes de guidage fines se tracent depuis ses bords,
 * 3. le carré se scinde en quatre tuiles, 4. l'ensemble pivote et les angles s'arrondissent,
 * 5. les tuiles se resserrent pour former le monogramme (la tuile haut-droite devient la panse verte du P),
 * 6. le mot « pedago » apparaît en sortant du flou, 7. la page monte depuis le bas.
 * Joué une seule fois par session ; respecte « réduire les animations ».
 */
const TILE_FINAL = [
  { x: 0, y: 0, r: 5, bg: "linear-gradient(135deg,#1f2226,#5b6068)", w: 17, h: 17 },
  { x: 19, y: 0, r: 999, bg: "linear-gradient(135deg,#0b8a55,#34c759)", w: 17, h: 25 },
  { x: 0, y: 19, r: 5, bg: "linear-gradient(135deg,#3a3e44,#7a8088)", w: 17, h: 17 },
  { x: 19, y: 19, r: 5, bg: "linear-gradient(135deg,#9aa0a7,#c9cdd2)", w: 17, h: 17 },
];

export function IntroLoader({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      onDone();
      return;
    }
    // Temps (ms) de chaque phase, calés sur les captures de l'original.
    const times = [80, 700, 1350, 1900, 2600, 3250, 4100];
    const timers = times.map((t, i) => setTimeout(() => setPhase(i + 1), t));
    const end = setTimeout(onDone, 4700);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(end);
    };
  }, [onDone]);

  const split = phase >= 3;
  const rotated = phase === 4;
  const merged = phase >= 5;
  const size = phase < 1 ? 6 : phase < 3 ? 34 : merged ? 36 : 84;
  const gap = split && !merged ? 7 : 2;
  const half = (size - gap) / 2;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--canvas)] transition-opacity duration-700"
      style={{ opacity: phase >= 7 ? 0 : 1, pointerEvents: phase >= 7 ? "none" : "auto" }}
      aria-hidden
    >
      {/* Lignes de guidage */}
      <div
        className="absolute inset-0 transition-transform duration-700"
        style={{ transform: `rotate(${rotated ? -24 : 0}deg) scale(${merged ? 0.6 : 1})`, opacity: phase >= 2 && !merged ? 1 : 0, transition: "opacity .6s, transform .7s cubic-bezier(.22,1,.36,1)" }}
      >
        {[-1, 1].map((s) => (
          <div key={`h${s}`} className="absolute left-0 right-0 h-px bg-black/10 transition-all duration-700" style={{ top: `calc(50% + ${(s * (split ? 46 : 17))}px)`, transform: `scaleX(${phase >= 2 ? 1 : 0})` }} />
        ))}
        {[-1, 1].map((s) => (
          <div key={`v${s}`} className="absolute bottom-0 top-0 w-px bg-black/10 transition-all duration-700" style={{ left: `calc(50% + ${(s * (split ? 46 : 17))}px)`, transform: `scaleY(${phase >= 2 ? 1 : 0})` }} />
        ))}
      </div>

      <div className="flex items-center" style={{ gap: merged ? 12 : 0, transition: "gap .6s" }}>
        {/* Carré → 4 tuiles → monogramme */}
        <div
          className="relative"
          style={{
            width: size,
            height: size,
            transform: `rotate(${rotated ? -24 : 0}deg)`,
            transition: "width .7s cubic-bezier(.34,1.56,.64,1), height .7s cubic-bezier(.34,1.56,.64,1), transform .7s cubic-bezier(.22,1,.36,1)",
          }}
        >
          {[0, 1, 2, 3].map((i) => {
            const col = i % 2, row = Math.floor(i / 2);
            const f = TILE_FINAL[i];
            const style = merged
              ? { left: f.x, top: f.y, width: f.w, height: i === 1 ? 25 : f.h, borderRadius: i === 1 ? "0 999px 999px 0" : f.r, background: f.bg, opacity: i === 3 ? 0 : 1 }
              : split
                ? { left: col * (half + gap), top: row * (half + gap), width: half, height: half, borderRadius: rotated ? 12 : 3, background: "linear-gradient(135deg,#3b3e43,#9a9fa6)", opacity: 1 }
                : { left: 0, top: 0, width: size, height: size, borderRadius: 2, background: "linear-gradient(135deg,#3b3e43,#9a9fa6)", opacity: i === 0 ? 1 : 0 };
            return (
              <span
                key={i}
                className="absolute"
                style={{ ...style, transition: `all .65s cubic-bezier(.34,1.4,.64,1) ${split && !merged ? i * 60 : 0}ms` }}
              />
            );
          })}
        </div>
        <span
          className="overflow-hidden text-[30px] font-semibold tracking-[-0.04em]"
          style={{
            maxWidth: phase >= 6 ? 200 : 0,
            opacity: phase >= 6 ? 1 : 0,
            filter: phase >= 6 ? "blur(0)" : "blur(8px)",
            transition: "max-width .7s cubic-bezier(.22,1,.36,1), opacity .5s, filter .6s",
          }}
        >
          pedago
        </span>
      </div>
    </div>
  );
}

/** Enveloppe : joue le loader une fois par session puis fait monter le contenu comme une carte. */
export function IntroGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"pending" | "intro" | "done">("pending");
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("pedago-intro") === "1";
    } catch {}
    // Lecture du stockage navigateur après hydratation (indisponible côté serveur) : setState voulu ici.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(seen ? "done" : "intro");
  }, []);
  return (
    <>
      {state === "intro" && (
        <IntroLoader
          onDone={() => {
            try {
              sessionStorage.setItem("pedago-intro", "1");
            } catch {}
            setState("done");
          }}
        />
      )}
      <div
        style={{
          transform: state === "done" ? "none" : "translateY(40px) scale(.97)",
          opacity: state === "done" ? 1 : 0,
          transition: "transform .9s cubic-bezier(.22,1,.36,1), opacity .6s",
        }}
      >
        {children}
      </div>
    </>
  );
}
