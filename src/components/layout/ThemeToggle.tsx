"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { clsx } from "clsx";

type Mode = "system" | "light" | "dark";
const KEY = "pedago-theme";

function read(): Mode {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}
const listeners = new Set<() => void>();
function apply(mode: Mode) {
  try {
    if (mode === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, mode);
  } catch {}
  if (mode === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = mode;
  listeners.forEach((l) => l());
}

/** Choix du thème : système, clair ou sombre. */
export function ThemeToggle() {
  const mode = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => "system" as Mode
  );
  const opts: { value: Mode; label: string; Icon: typeof Sun }[] = [
    { value: "system", label: "Thème du système", Icon: Monitor },
    { value: "light", label: "Thème clair", Icon: Sun },
    { value: "dark", label: "Thème sombre", Icon: Moon },
  ];
  return (
    <div role="radiogroup" aria-label="Thème" className="flex rounded-lg border border-[var(--line-strong)] bg-surface p-0.5">
      {opts.map(({ value, label, Icon }) => (
        <button
          key={value}
          role="radio"
          aria-checked={mode === value}
          aria-label={label}
          title={label}
          onClick={() => apply(value)}
          className={clsx("flex flex-1 items-center justify-center rounded-md py-1.5 transition-colors", mode === value ? "bg-[var(--accent-soft)] text-accent" : "text-muted hover:text-ink")}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  );
}
