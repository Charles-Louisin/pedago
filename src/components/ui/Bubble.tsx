"use client";

import { clsx } from "clsx";
import { Eye, EyeOff, Search } from "lucide-react";
import { useId, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";

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

/**
 * Champ de saisie : libellé, erreur sous le champ (annoncée, liée par aria-describedby), aide facultative.
 * Mot de passe : bouton œil pour afficher / masquer la saisie.
 */
export function BubbleField({ label, className, error, hint, type, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; hint?: ReactNode }) {
  const [reveal, setReveal] = useState(false);
  const id = useId();
  const secret = type === "password";
  return (
    <div className={clsx("block", className)}>
      <label htmlFor={id} className={clsx("mb-1.5 block text-[12px] font-medium text-muted", !label && "sr-only")}>
        {label ?? rest.placeholder}
      </label>
      <span className={clsx("bubble-field flex h-11 items-center pl-4", secret ? "pr-1" : "pr-4", error && "!shadow-[0_0_0_1.5px_var(--red)]")}>
        <input
          id={id}
          {...rest}
          type={secret && reveal ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${id}-help` : undefined}
          className="w-full bg-transparent text-[14px] outline-none placeholder:text-faint"
        />
        {secret && (
          <button
            type="button"
            onClick={() => setReveal(!reveal)}
            aria-label={reveal ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            aria-pressed={reveal}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:bg-ink/5 hover:text-ink"
          >
            {reveal ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </span>
      {error ? (
        <p id={`${id}-help`} role="alert" className="mt-1.5 text-[12.5px] text-red">
          {error}
        </p>
      ) : hint ? (
        <div id={`${id}-help`} className="mt-1.5 text-[12.5px] text-muted">
          {hint}
        </div>
      ) : null}
    </div>
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
        background: checked ? "var(--accent)" : "var(--line-strong)",
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
      <div className="absolute top-1/2 h-2 w-full -translate-y-1/2 rounded-full bg-[var(--line-strong)]" />
      <div className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full" style={{ width: `${pct}%`, background: "var(--accent)" }} />
      <div className="glass-knob absolute top-1/2 h-8 w-12 -translate-x-1/2 -translate-y-1/2 transition-transform active:scale-110" style={{ left: `${pct}%` }} />
    </div>
  );
}
