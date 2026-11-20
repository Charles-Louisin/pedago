"use client";

import { clsx } from "clsx";
import type { ReactNode, SelectHTMLAttributes } from "react";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 rise-in">
      <div>
        {eyebrow && <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-muted">{eyebrow}</p>}
        <h1 className="text-[32px] font-semibold leading-tight">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[14.5px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

const PILL: Record<string, string> = {
  PUBLISHED: "bg-[var(--accent-soft)] text-accent",
  APPROVED: "bg-[var(--blue-soft)] text-blue",
  HUMAN_REVIEW: "bg-[var(--sun-soft)] text-sun",
  AI_CHECKED: "bg-[var(--blue-soft)] text-blue",
  DRAFT: "bg-ink/5 text-ink-2",
  REJECTED: "bg-[var(--red-soft)] text-red",
  ARCHIVED: "bg-ink/5 text-muted",
  done: "bg-[var(--accent-soft)] text-accent",
  waiting_review: "bg-[var(--sun-soft)] text-sun",
  running: "bg-[var(--blue-soft)] text-blue",
  queued: "bg-ink/5 text-ink-2",
  failed: "bg-[var(--red-soft)] text-red",
  budget_exceeded: "bg-[var(--red-soft)] text-red",
  cancelled: "bg-ink/5 text-muted",
  validated: "bg-[var(--accent-soft)] text-accent",
  extracted: "bg-[var(--sun-soft)] text-sun",
  retired: "bg-ink/5 text-muted",
};

export function Pill({ status, children }: { status: string; children: ReactNode }) {
  return <span className={clsx("inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold", PILL[status] ?? "bg-ink/5 text-ink-2")}>{children}</span>;
}

/** Sélecteur segmenté façon pilule, avec indicateur glissant. */
export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="bubble-field inline-flex gap-1 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all duration-300",
            value === o.value ? "bubble text-ink" : "text-muted hover:text-ink"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Select({ label, className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className={clsx("block", className)}>
      {label && <span className="mb-1.5 block text-[12px] font-medium text-muted">{label}</span>}
      <span className="bubble-field flex h-11 items-center px-3">
        <select {...rest} className="w-full bg-transparent text-[14px] outline-none">
          {children}
        </select>
      </span>
    </label>
  );
}

export function Stat({ label, value, hint, accent }: { label: string; value: ReactNode; hint?: string; accent?: string }) {
  return (
    <div className="card p-5">
      <p className="text-[12.5px] font-medium text-muted">{label}</p>
      <p className="mt-2 text-[30px] font-semibold tracking-[-0.03em]" style={{ color: accent }}>
        {value}
      </p>
      {hint && <p className="mt-1 text-[12px] text-faint">{hint}</p>}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-[15px] font-semibold">{title}</p>
      {children && <div className="mt-1.5 max-w-sm text-[13.5px] text-muted">{children}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-xl bg-ink/[.06]", className)} />;
}

/** Indicateur d'état compact (remplace les décorations) : pastille colorée + icône. */
export function StatusIcon({ state, size = 56 }: { state: "idle" | "busy" | "warn" | "error"; size?: number }) {
  const map = {
    idle: { bg: "bg-[var(--accent-soft)]", fg: "text-accent", d: "M5 12l4 4L19 6" },
    busy: { bg: "bg-[var(--blue-soft)]", fg: "text-blue", d: "M12 3a9 9 0 1 0 9 9" },
    warn: { bg: "bg-[var(--sun-soft)]", fg: "text-sun", d: "M12 8v5m0 3h.01" },
    error: { bg: "bg-[var(--red-soft)]", fg: "text-red", d: "M12 8v5m0 3h.01" },
  }[state];
  return (
    <span className={clsx("inline-flex shrink-0 items-center justify-center rounded-full", map.bg, map.fg)} style={{ width: size, height: size }} aria-hidden>
      <svg width={size * 0.45} height={size * 0.45} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={state === "busy" ? "animate-spin" : undefined}>
        <path d={map.d} />
      </svg>
    </span>
  );
}
