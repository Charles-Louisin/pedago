"use client";

import { useId } from "react";

export type OrbState = "idle" | "thinking" | "searching" | "success" | "error";

/**
 * Orbe en verre liquide (recréation de « Liquid Glass Orb », palette monochrome) :
 * couleurs fluides en rotation + distorsion animée (feTurbulence/feDisplacementMap) + reflets + grain.
 * L'état pilote la vitesse et la couleur : idle, thinking (ondulations), searching (lentille), success, error.
 */
export function LiquidOrb({ size = 160, state = "idle" }: { size?: number; state?: OrbState }) {
  const id = useId().replace(/:/g, "");
  const speed = state === "thinking" ? 5 : state === "searching" ? 3 : 14;
  const tint =
    state === "success" ? "rgba(52,199,89,.55)" : state === "error" ? "rgba(217,58,43,.55)" : state === "searching" ? "rgba(47,111,237,.45)" : "rgba(0,0,0,0)";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-label={`Assistant : ${state}`} role="img">
      <svg width="0" height="0" className="absolute">
        <filter id={`liq-${id}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.009" numOctaves="2" seed="4">
            <animate attributeName="baseFrequency" dur={`${speed * 2}s`} values="0.007;0.013;0.007" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale={state === "thinking" ? 110 : 80} />
        </filter>
      </svg>
      <div className="grain absolute inset-0 overflow-hidden rounded-full" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,.4), 0 20px 40px -20px rgba(0,0,0,.45)" }}>
        <div
          className="absolute inset-[-30%]"
          style={{
            filter: `url(#liq-${id})`,
            animation: `spin ${speed}s linear infinite`,
            // Taches fluides (pas de dégradé conique : pas de pincement au centre), déformées en plis organiques.
            background: [
              "radial-gradient(38% 16% at 30% 28%, #ffffff 0%, rgba(255,255,255,0) 70%)",
              "radial-gradient(34% 20% at 72% 62%, #0b0c0e 0%, rgba(11,12,14,0) 72%)",
              "radial-gradient(30% 13% at 46% 82%, #f4f6f8 0%, rgba(244,246,248,0) 70%)",
              "radial-gradient(48% 24% at 62% 24%, #24272b 0%, rgba(36,39,43,0) 70%)",
              "radial-gradient(44% 30% at 22% 66%, #b9c0c7 0%, rgba(185,192,199,0) 72%)",
              "radial-gradient(26% 12% at 80% 40%, #ffffff 0%, rgba(255,255,255,0) 70%)",
              "linear-gradient(160deg,#6b7078,#2c2f34)",
            ].join(","),
          }}
        />
        <div className="absolute inset-0 transition-colors duration-700" style={{ background: tint, mixBlendMode: "color" }} />
        <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(60% 45% at 35% 22%,rgba(255,255,255,.7),rgba(255,255,255,0) 60%)" }} />
        <div className="absolute inset-0 rounded-full" style={{ boxShadow: "inset 0 -18px 30px rgba(0,0,0,.35), inset 0 6px 14px rgba(255,255,255,.35)" }} />
        {state === "thinking" && (
          <div className="absolute inset-[18%] animate-ping rounded-full border border-white/40" style={{ animationDuration: "2.4s" }} />
        )}
      </div>
    </div>
  );
}
