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
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="4">
            <animate attributeName="baseFrequency" dur={`${speed * 2}s`} values="0.010;0.018;0.010" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale={state === "thinking" ? 70 : 45} />
        </filter>
      </svg>
      <div className="grain absolute inset-0 overflow-hidden rounded-full" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,.4), 0 20px 40px -20px rgba(0,0,0,.45)" }}>
        <div
          className="absolute inset-[-30%]"
          style={{
            filter: `url(#liq-${id})`,
            animation: `spin ${speed}s linear infinite`,
            background:
              "conic-gradient(from 20deg,#0d0e10,#e9ecef 12%,#5c6168 22%,#ffffff 30%,#2a2d31 42%,#c7ccd2 55%,#0d0e10 66%,#9aa1a9 78%,#ffffff 86%,#0d0e10)",
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
