"use client";

import { clsx } from "clsx";
import { Search } from "lucide-react";
import { useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";

type Tone = "default" | "green" | "ink" | "red";

export function BubbleButton({
  tone = "default",
  size = "md",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; size?: "sm" | "md" | "lg" }) {
  return (
    <button
      {...rest}
      className={clsx(
        "bubble inline-flex select-none items-center justify-center gap-2 font-semibold tracking-[-0.01em]",
        tone !== "default" && `bubble-${tone}`,
        size === "sm" && "h-9 px-4 text-[13px]",
        size === "md" && "h-11 px-5 text-[14px]",
        size === "lg" && "h-14 px-7 text-[17px]",
        className
      )}
    >
      {children}
    </button>
  );
}

export function BubbleIconButton({
  tone = "default",
  size = 44,
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; size?: number; label: string; children: ReactNode }) {
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      style={{ width: size, height: size }}
      className={clsx("bubble inline-flex shrink-0 items-center justify-center", tone !== "default" && `bubble-${tone}`, className)}
    >
      {children}
    </button>
  );
}

export function BubbleSearch({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={clsx("bubble-field flex h-11 items-center gap-2.5 px-4", className)}>
      <Search size={17} className="text-muted" />
      <input {...rest} className="w-full bg-transparent text-[14px] outline-none placeholder:text-faint" />
    </label>
  );
}

export function BubbleField({ label, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className={clsx("block", className)}>
      {label && <span className="mb-1.5 block text-[12px] font-medium text-muted">{label}</span>}
      <span className="bubble-field flex h-11 items-center px-4">
        <input {...rest} className="w-full bg-transparent text-[14px] outline-none placeholder:text-faint" />
      </span>
    </label>
  );
}

/** Interrupteur : piste verte + bouton de verre qui s'étire pendant le déplacement. */
export function BubbleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="group relative h-8 w-[58px] shrink-0 rounded-full transition-colors duration-300"
      style={{
        background: checked ? "linear-gradient(180deg,#4fd774,#23b14d)" : "linear-gradient(180deg,#e2e2e2,#ececec)",
        boxShadow: "inset 0 2px 4px rgba(0,0,0,.12), inset 0 -1px 1px rgba(255,255,255,.6)",
      }}
    >
      <span
        className="glass-knob absolute top-[3px] h-[26px] w-[34px] transition-all duration-500 group-active:w-[40px]"
        style={{ left: checked ? 21 : 3, transitionTimingFunction: "cubic-bezier(.34,1.56,.64,1)" }}
      />
    </button>
  );
}

/** Curseur : remplissage bleu, poignée ovale en verre. */
export function BubbleSlider({ value, onChange, min = 0, max = 100, step = 1, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const pct = ((value - min) / (max - min)) * 100;
  const setFromX = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    const raw = min + ((clientX - r.left) / r.width) * (max - min);
    onChange(Math.min(max, Math.max(min, Math.round(raw / step) * step)));
  };
  return (
    <div
      ref={ref}
      role="slider"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      className="relative h-10 cursor-pointer touch-none select-none"
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        setFromX(e.clientX);
      }}
      onPointerMove={(e) => e.buttons === 1 && setFromX(e.clientX)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") onChange(Math.min(max, value + step));
        if (e.key === "ArrowLeft") onChange(Math.max(min, value - step));
      }}
    >
      <div className="absolute top-1/2 h-2 w-full -translate-y-1/2 rounded-full bg-[#e3e3e3]" />
      <div className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#2f6fed,#4c86ff)" }} />
      <div className="glass-knob absolute top-1/2 h-8 w-12 -translate-x-1/2 -translate-y-1/2 transition-transform active:scale-110" style={{ left: `${pct}%` }} />
    </div>
  );
}
