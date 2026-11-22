"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight, BookOpenCheck, Camera, ChevronLeft, ChevronRight, CloudOff, PenLine, Printer } from "lucide-react";
import { HeroVideo } from "./HeroVideo";
import { D, Device, DownloadButton, EASE, H2, PRIMARY, Reveal, SECONDARY, scrollToAnchor } from "./ui";

/** Largeur des captures de l'app : jamais plus hautes que l'écran, sur ordinateur comme sur téléphone. */
const PHONE = "w-[min(72vw,280px,calc((100svh-190px)*0.46))]";

const desktopQuery = "(min-width: 1024px)";
const subscribeDesktop = (cb: () => void) => {
  const mq = window.matchMedia(desktopQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const useDesktop = () => useSyncExternalStore(subscribeDesktop, () => window.matchMedia(desktopQuery).matches, () => true);

/* ───────────────────────── Accueil ───────────────────────── */

export function Hero({ apkUrl }: { apkUrl: string | null }) {
  return (
    <section id="accueil" className="relative z-10 pt-28 pb-16 sm:pt-36 lg:pb-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <h1 className="site-enter text-[clamp(40px,8vw,66px)] font-semibold leading-[0.98] tracking-[-0.035em] [text-wrap:balance]" style={{ ["--d" as string]: "0s" }}>
            Prépare ta classe <span className="text-[#1F7A4D]">en une photo.</span>
          </h1>
          <p className="site-enter mt-6 max-w-[34rem] text-[17px] leading-relaxed text-[#4a4a4a] sm:text-[18px]" style={{ ["--d" as string]: ".08s" }}>
            Photographie ta fiche manuscrite : PEDAGO la remet au propre, l’adapte au niveau de ta classe et la garde prête à imprimer, même sans réseau.
          </p>
          <div className="site-enter mt-8 flex flex-wrap gap-3" style={{ ["--d" as string]: ".16s" }}>
            <DownloadButton apkUrl={apkUrl} className={PRIMARY} />
            <button type="button" onClick={() => scrollToAnchor("#histoire")} className={SECONDARY}>
              Voir comment <ArrowRight size={17} />
            </button>
          </div>
        </div>

        <div className="site-enter" style={{ ["--d" as string]: ".12s", ["--y" as string]: "32px" }}>
          <HeroVideo />
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Comment ça marche ───────────────────────── */

const STEPS = [
  { icon: Camera, title: "Photographie ta fiche", text: "Une photo de ta fiche manuscrite suffit. PEDAGO lit le cartouche, l’objectif, le déroulement et les exercices.", screen: "fiche" },
  { icon: Printer, title: "Imprime-la au bon niveau", text: "Facile, standard ou approfondi : la fiche s’adapte à ta classe, avec les corrigés si tu veux.", screen: "imprimer" },
  { icon: BookOpenCheck, title: "Fais le bilan le soir", text: "Trente secondes : faite, partielle ou reportée. Ton programme se recale tout seul.", screen: "bilan" },
  { icon: CloudOff, title: "Retrouve-la hors ligne", text: "Tes leçons restent sur ton téléphone. Sans réseau à l’école, tout s’ouvre et s’imprime.", screen: "hors-connexion" },
] as const;
const STEP_MS = 6000;

function StepPhone({ i }: { i: number }) {
  const s = STEPS[i];
  return (
    <Device>
      <div className="relative aspect-[390/844] bg-white">
        <AnimatePresence initial={false}>
          <motion.img
            key={s.screen}
            src={`/site/screens/${s.screen}.jpg`}
            alt={`Écran de l’app : ${s.title}`}
            width={390}
            height={844}
            decoding="async"
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: D.base, ease: EASE }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>
      </div>
    </Device>
  );
}

export function HowItWorks() {
  const desktop = useDesktop();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [seen, setSeen] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const items = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // Sur ordinateur, les étapes avancent seules (pause au survol). Sur téléphone, jamais : la page bougerait sous le doigt.
  const auto = desktop && seen && !paused;
  useEffect(() => {
    if (!auto || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % STEPS.length), STEP_MS);
    return () => clearTimeout(t);
  }, [active, auto]);

  const select = (i: number) => {
    setActive(i);
    if (desktop) return;
    // Sur téléphone, l'étape précédente se replie : on garde l'étape touchée sous la barre du haut.
    setTimeout(() => {
      const top = items.current[i]?.getBoundingClientRect().top ?? 100;
      if (top < 84) window.scrollTo({ top: window.scrollY + top - 92, behavior: "smooth" });
    }, D.quick * 1000 + 40);
  };

  return (
    <section id="histoire" ref={ref} className="relative z-10 bg-white py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <h2 className={`${H2} max-w-2xl`}>Quatre gestes, et ta semaine est prête.</h2>
        </Reveal>
        <div className="mt-12 grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]" onPointerEnter={(e) => e.pointerType === "mouse" && setPaused(true)} onPointerLeave={() => setPaused(false)}>
          <ol className="grid gap-2" role="tablist" aria-label="Étapes">
            {STEPS.map((s, i) => {
              const on = i === active;
              return (
                <li key={s.title} ref={(el) => void (items.current[i] = el)}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => select(i)}
                    className={`relative w-full overflow-hidden rounded-[16px] p-5 text-left transition-colors duration-300 ${on ? "bg-[#f1f5f0]" : "hover:bg-black/[0.03]"}`}
                  >
                    <div className="flex items-start gap-4">
                      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[12px] transition-colors duration-300 ${on ? "bg-[#1F7A4D] text-white" : "bg-black/5 text-[#3d3d3d]"}`}>
                        <s.icon size={19} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="pt-2.5 text-[17px] font-semibold leading-tight">{s.title}</h3>
                        <AnimatePresence initial={false}>
                          {on && (
                            <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: D.quick, ease: EASE }} className="overflow-hidden text-[15px] leading-relaxed text-[#4a4a4a]">
                              <span className="block pt-2">{s.text}</span>
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    {on && desktop && (
                      <span className="absolute inset-x-5 bottom-0 h-[3px] overflow-hidden rounded-full bg-[#1F7A4D]/10">
                        <span key={`${active}-${auto}`} className="block h-full origin-left bg-[#1F7A4D]" style={{ animation: auto ? `site-progress ${STEP_MS}ms linear both` : "none", transform: auto ? undefined : "scaleX(0)" }} />
                      </span>
                    )}
                  </button>
                  {/* Téléphone : la démo s'ouvre juste sous l'étape choisie. */}
                  {!desktop && (
                    <AnimatePresence initial={false}>
                      {on && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: D.quick, ease: EASE }} className="overflow-hidden">
                          <div className={`mx-auto ${PHONE} pb-6 pt-4`}>
                            <StepPhone i={i} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </li>
              );
            })}
          </ol>
          {desktop && (
            <div className={`mx-auto ${PHONE}`}>
              <StepPhone i={active} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Avant / après ───────────────────────── */

const PRESETS = [
  [100, "Manuscrite"],
  [50, "Les deux"],
  [0, "PEDAGO"],
] as const;

export function Compare() {
  const [pos, setPos] = useState(50);
  const [dragging, setDragging] = useState(false);
  const ease = dragging ? "none" : ".45s cubic-bezier(.16,1,.3,1)";
  return (
    <section id="avant-apres" className="relative z-10 py-24 sm:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-[1fr_1.1fr]">
        <Reveal>
          <h2 className={H2}>Elle reste ta fiche. En plus propre.</h2>
          <p className="mt-5 max-w-md text-[17px] leading-relaxed text-[#4a4a4a]">
            Fais glisser la poignée : à gauche, la fiche écrite à la main ; à droite, la même fiche remise en page par PEDAGO. Même école, même objectif, mêmes exercices.
          </p>
          <div className="mt-7 inline-flex rounded-full bg-black/[0.05] p-1" role="group" aria-label="Affichage">
            {PRESETS.map(([v, l]) => (
              <button key={l} type="button" onClick={() => setPos(v)} aria-pressed={pos === v} className={`h-10 rounded-full px-4 text-[14px] font-semibold transition-colors duration-200 ${pos === v ? "bg-white text-[#171717] shadow-[0_2px_6px_-2px_rgba(23,23,23,.25)]" : "text-[#4a4a4a] hover:text-[#171717]"}`}>
                {l}
              </button>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="relative mx-auto aspect-[3/4] w-[min(100%,460px,calc((100svh-180px)*0.75))] select-none overflow-hidden rounded-[20px] bg-[#efe8dc] shadow-[0_40px_80px_-40px_rgba(23,23,23,.45)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/site/screens/fiche-a4.jpg" alt="La fiche remise en page par PEDAGO" width={1280} height={1810} decoding="async" loading="lazy" className="absolute inset-0 h-full w-full bg-white object-cover object-top" />
            <div className="absolute inset-0 will-change-[clip-path]" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)`, transition: `clip-path ${ease}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/site/fiche/manuscrite.jpg" alt="La fiche de préparation écrite à la main" width={2752} height={1536} decoding="async" loading="lazy" className="h-full w-full object-cover object-[50%_45%]" />
            </div>
            <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,.25)]" style={{ left: `${pos}%`, transition: `left ${ease}` }}>
              <span className="absolute left-1/2 top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[#171717] shadow-[0_6px_16px_-6px_rgba(0,0,0,.45)]">
                <ChevronLeft size={15} className="-mr-1" />
                <ChevronRight size={15} className="-ml-1" />
              </span>
            </div>
            <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-[12px] font-semibold text-white">Manuscrite</span>
            <span className="absolute right-3 top-3 rounded-full bg-[#1F7A4D] px-3 py-1 text-[12px] font-semibold text-white">PEDAGO</span>
            <input
              type="range"
              min={0}
              max={100}
              value={pos}
              onChange={(e) => setPos(Number(e.target.value))}
              onPointerDown={() => setDragging(true)}
              onPointerUp={() => setDragging(false)}
              onPointerCancel={() => setDragging(false)}
              aria-label="Comparer la fiche manuscrite et la fiche PEDAGO"
              className="absolute inset-0 h-full w-full cursor-ew-resize touch-pan-y opacity-0"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────────────────── Bénéfices ───────────────────────── */

const BENEFITS = [
  { icon: PenLine, title: "Fini de recopier", text: "Ta fiche est lue une fois, puis réutilisée et imprimée autant de fois qu’il le faut." },
  { icon: Printer, title: "Une fiche propre", text: "Mise en page fidèle, niveau adapté, corrigés en option : prête pour l’inspection." },
  { icon: BookOpenCheck, title: "Un programme à jour", text: "Les leçons du jour arrivent seules, alignées sur les programmes officiels." },
  { icon: CloudOff, title: "Partout, tout le temps", text: "Sans connexion à l’école, sans données mobiles : PEDAGO fonctionne." },
];

export function Benefits({ apkUrl }: { apkUrl: string | null }) {
  return (
    <section id="avantages" className="relative z-10 bg-white py-24 sm:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <h2 className={H2}>Tes soirées, et une classe prête chaque matin.</h2>
          <div className="mt-8">
            <DownloadButton apkUrl={apkUrl} className={PRIMARY} />
          </div>
        </Reveal>
        <ul className="border-t border-black/[0.08]">
          {BENEFITS.map((b) => (
            <li key={b.title} className="group flex gap-5 border-b border-black/[0.08] py-7">
              <b.icon size={22} className="mt-1 shrink-0 text-[#1F7A4D] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" />
              <div>
                <h3 className="text-[20px] font-semibold tracking-[-0.015em]">{b.title}</h3>
                <p className="mt-1.5 max-w-[46ch] text-[15.5px] leading-relaxed text-[#4a4a4a]">{b.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ───────────────────────── Écrans ───────────────────────── */

const SCREENS = [
  ["accueil", "Aujourd’hui"],
  ["fiche", "Ma fiche"],
  ["imprimer", "Imprimer"],
  ["bilan", "Bilan"],
  ["programme", "Programme"],
  ["filtres", "Filtres"],
  ["bibliotheque", "Bibliothèque"],
  ["hors-connexion", "Hors connexion"],
  ["moi", "Moi"],
  ["connexion", "Connexion"],
] as const;

export function Gallery() {
  const ref = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const update = () => {
    const el = ref.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
  };
  const move = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(260, el.clientWidth * 0.8), behavior: "smooth" });
  };
  const arrow = "grid h-11 w-11 place-items-center rounded-full bg-white shadow-[0_0_0_1px_rgba(23,23,23,.1)] transition-[opacity,background-color] hover:bg-black/5 disabled:pointer-events-none disabled:opacity-35";
  const pad = "px-[max(1.25rem,calc((100vw-72rem)/2+1.25rem))] scroll-px-[max(1.25rem,calc((100vw-72rem)/2+1.25rem))]";
  return (
    <section id="ecrans" className="relative z-10 py-24 sm:py-28" aria-label="Écrans de l’app">
      <div className="mx-auto flex max-w-6xl items-end justify-between gap-6 px-5">
        <Reveal>
          <h2 className={H2}>Tout PEDAGO, écran par écran.</h2>
        </Reveal>
        <div className="hidden gap-2 sm:flex">
          <button type="button" onClick={() => move(-1)} disabled={edge.start} aria-label="Écrans précédents" className={arrow}>
            <ChevronLeft size={19} />
          </button>
          <button type="button" onClick={() => move(1)} disabled={edge.end} aria-label="Écrans suivants" className={arrow}>
            <ChevronRight size={19} />
          </button>
        </div>
      </div>
      <ul ref={ref} onScroll={update} className={`mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto overscroll-x-contain pb-6 pt-2 [scrollbar-width:none] ${pad}`}>
        {SCREENS.map(([file, label]) => (
          <li key={file} className="group w-[min(200px,calc((100svh-200px)*0.46))] shrink-0 snap-start sm:w-[min(230px,calc((100svh-200px)*0.46))]">
            <Device className="transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:-translate-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/site/screens/${file}.jpg`} alt={`Écran ${label} de l’app PEDAGO`} loading="lazy" decoding="async" width={390} height={844} />
            </Device>
            <p className="mt-3 text-center text-[14px] font-medium text-[#3d3d3d]">{label}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
