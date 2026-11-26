"use client";

import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowDown, BookOpen, CalendarCheck, CloudDownload, FileText, ImagePlus, Play, Sparkles, Sun } from "lucide-react";
import { HeroVideo } from "./HeroVideo";
import { D, Device, DownloadButton, EASE, H2, PRIMARY, Reveal, scrollToAnchor } from "./ui";

/** Largeur des captures de l'app : jamais plus hautes que l'écran, sur ordinateur comme sur téléphone. */
const PHONE = "w-[min(72vw,280px,calc((100svh-190px)*0.46))]";

const desktopQuery = "(min-width: 1024px)";
const subscribeDesktop = (cb: () => void) => {
  const mq = window.matchMedia(desktopQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const useDesktop = () => useSyncExternalStore(subscribeDesktop, () => window.matchMedia(desktopQuery).matches, () => true);

/** Délai d'animation CSS (voir .site-word, .site-gem… dans globals.css). */
const d = (s: number, extra?: Record<string, string>) => ({ ["--d" as string]: `${s}s`, ...extra });

/* ───────────────────────── Accueil ───────────────────────── */

const GEMS = [
  { icon: CalendarCheck, label: "Programme", from: "#F7C45A", to: "#E08A1E" },
  { icon: BookOpen, label: "Fiches", from: "#4FD08A", to: "#1A8A4C" },
  { icon: Sparkles, label: "Illustrations", from: "#8DB5FF", to: "#2F6FDB" },
];

function Word({ children, delay }: { children: string; delay: number }) {
  return (
    <span className="inline-block overflow-hidden pb-[0.08em] align-bottom">
      <span className="site-word" style={d(delay)}>
        {children}
      </span>
    </span>
  );
}

export function Hero({ apkUrl }: { apkUrl: string | null }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  // En descendant, la photo glisse plus lentement que la carte : un peu de profondeur, sans en faire trop.
  const y = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "14%"]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, reduce ? 1 : 0.25]);
  return (
    <section id="accueil" ref={ref} className="relative z-10 px-3 pt-[84px] sm:px-5">
      <div className="site-card-in relative mx-auto flex max-w-[1400px] overflow-hidden sm:min-h-[600px] rounded-[32px] bg-[#151515] sm:h-[min(80svh,780px)]" style={d(0)}>
        <motion.div className="absolute inset-0" style={{ y }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/site/photos/enseignante.jpg"
            alt=""
            width={2400}
            height={3600}
            fetchPriority="high"
            decoding="async"
            className="site-kenburns h-[115%] w-full object-cover object-[60%_38%] sm:object-[62%_50%]"
            style={d(0)}
          />
        </motion.div>
        {/* Voile : sombre à gauche pour le texte, transparent sur le visage. */}
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,rgba(12,12,11,.86)_0%,rgba(12,12,11,.62)_34%,rgba(12,12,11,.12)_66%,rgba(12,12,11,0)_100%)] max-sm:bg-[linear-gradient(0deg,rgba(12,12,11,.9)_0%,rgba(12,12,11,.72)_55%,rgba(12,12,11,.45)_100%)]" />
        <div aria-hidden className="absolute inset-0 bg-black/15" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/45 to-transparent" />

        <motion.div style={{ opacity: fade }} className="relative flex w-full flex-col justify-center px-6 pb-14 pt-24 sm:justify-center sm:px-14 sm:py-16 lg:px-24">
          <h1 className="max-w-[12ch] text-[clamp(44px,7vw,96px)] font-extrabold leading-[0.95] tracking-[-0.035em] text-white">
            <Word delay={0.15}>Ta</Word> <Word delay={0.22}>classe</Word>{" "}
            <span className="relative inline-block">
              <Word delay={0.29}>prête</Word>
              <svg aria-hidden viewBox="0 0 220 30" className="absolute -bottom-[0.16em] left-[-4%] h-[0.32em] w-[108%] overflow-visible" preserveAspectRatio="none">
                <path d="M4 22 C 60 6, 150 2, 216 12" pathLength={1} fill="none" stroke="#2BB36A" strokeWidth="9" strokeLinecap="round" className="site-draw" style={d(0.85)} />
              </svg>
            </span>{" "}
            <Word delay={0.36}>chaque</Word> <Word delay={0.43}>matin.</Word>
          </h1>
          <p className="site-enter mt-7 max-w-[30rem] text-[16.5px] leading-relaxed text-white/85 sm:text-[18px]" style={d(0.55)}>
            La leçon du moment, sa fiche prête à imprimer et ton bilan en un geste. <strong className="font-semibold text-white">Même sans réseau.</strong>
          </p>
          <div className="site-enter mt-8 flex flex-wrap gap-3" style={d(0.65)}>
            <DownloadButton apkUrl={apkUrl} className={PRIMARY} />
            <button
              type="button"
              onClick={() => scrollToAnchor("#film")}
              className="inline-flex h-14 items-center gap-2.5 rounded-[16px] bg-white/12 px-6 text-[16px] font-semibold text-white ring-1 ring-white/25 backdrop-blur-md transition-colors duration-300 hover:bg-white/20"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-[#151515]">
                <Play size={13} fill="currentColor" className="translate-x-px" />
              </span>
              Voir le film
            </button>
          </div>
        </motion.div>

        {/* Pastilles flottantes (comme les gemmes de la référence) : les trois piliers de l'app. */}
        <ul className="absolute right-5 top-1/2 hidden -translate-y-1/2 flex-col gap-4 sm:flex lg:right-12" aria-hidden>
          {GEMS.map((g, i) => (
            <li key={g.label} className="site-gem group relative" style={d(1 + i * 0.12, { ["--f" as string]: `${i * 0.6}s` })}>
              <span
                className="grid h-[58px] w-[58px] place-items-center rounded-[18px] text-white shadow-[0_14px_30px_-12px_rgba(0,0,0,.6),inset_0_2px_0_rgba(255,255,255,.45),inset_0_-3px_0_rgba(0,0,0,.15)] transition-transform duration-300 group-hover:-translate-x-1 group-hover:rotate-[-6deg]"
                style={{ background: `linear-gradient(145deg, ${g.from}, ${g.to})` }}
              >
                <g.icon size={24} strokeWidth={2.2} />
              </span>
              <span className="pointer-events-none absolute right-[72px] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-white px-3 py-1 text-[12.5px] font-semibold text-[#151515] opacity-0 transition-all duration-300 group-hover:right-[70px] group-hover:opacity-100">
                {g.label}
              </span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => scrollToAnchor("#pourquoi")}
          aria-label="Découvrir la suite"
          className="site-enter absolute bottom-6 right-6 hidden h-12 w-12 place-items-center rounded-full bg-white/12 text-white ring-1 ring-white/25 backdrop-blur-md transition-colors hover:bg-white/20 sm:grid"
          style={d(1.2)}
        >
          <ArrowDown size={19} className="animate-[site-float_2.4s_ease-in-out_infinite]" />
        </button>
      </div>
    </section>
  );
}

/* ───────────────────────── Pourquoi PEDAGO ───────────────────────── */

const FACTS = [
  ["SIL → CM2", "et Class One → Six"],
  ["2 min", "pour installer l’app"],
  ["100 %", "lisible hors connexion"],
];

export function Why() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const r1 = useTransform(scrollYProgress, [0, 0.5], reduce ? [-7, -7] : [-16, -7]);
  const r2 = useTransform(scrollYProgress, [0, 0.5], reduce ? [6, 6] : [16, 6]);
  const y1 = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [60, -60]);
  const y2 = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [120, -40]);
  return (
    <section id="pourquoi" ref={ref} className="relative z-10 overflow-hidden py-24 sm:py-32">
      {/* Grand trait de fond, très clair (comme la référence). */}
      <svg aria-hidden viewBox="0 0 1400 900" className="pointer-events-none absolute inset-0 -z-10 h-full w-full" preserveAspectRatio="none">
        <path d="M640 -40 C 760 200, 980 420, 1160 940" fill="none" stroke="#F4F1EC" strokeWidth="70" strokeLinecap="round" />
      </svg>
      <motion.figure style={{ rotate: r1, y: y1 }} className="absolute left-[2%] top-24 hidden w-[min(21vw,300px)] overflow-hidden rounded-[28px] bg-[#EAE4DB] p-0 shadow-[0_40px_70px_-40px_rgba(21,21,21,.45)] lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/site/photos/classe.jpg" alt="Une enseignante devant sa classe" width={1200} height={1800} loading="lazy" decoding="async" className="aspect-[4/5] w-full object-cover" />
      </motion.figure>
      <motion.figure style={{ rotate: r2, y: y2 }} className="absolute right-[2%] top-[60%] hidden w-[min(22vw,310px)] overflow-hidden rounded-[28px] bg-[#1A8A4C] shadow-[0_40px_70px_-40px_rgba(21,21,21,.45)] lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/site/photos/eleves.jpg" alt="Des élèves lèvent la main pendant la leçon" width={1200} height={800} loading="lazy" decoding="async" className="aspect-[5/4] w-full object-cover" />
      </motion.figure>

      <div className="mx-auto max-w-2xl px-5 text-center">
        <Reveal>
          <h2 className={H2}>Moins de soirées à préparer. Plus de temps pour tes élèves.</h2>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-[#6B6158]">
            PEDAGO suit le programme officiel de ta classe. Chaque matin, la leçon du moment t’attend avec sa fiche complète, prête à imprimer.
          </p>
        </Reveal>
      </div>

      <ul className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-3 px-5 sm:grid-cols-3">
        {FACTS.map(([big, small], i) => (
          <motion.li
            key={big}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: D.slow, ease: EASE, delay: 0.1 + i * 0.07 }}
            className="rounded-[22px] bg-[#F7F5F1] px-2 py-5 text-center last:col-span-2 sm:last:col-span-1"
          >
            <p className="font-display whitespace-nowrap text-[clamp(19px,5.6vw,28px)] font-extrabold tracking-[-0.03em] text-[#151515]">{big}</p>
            <p className="mt-1 text-[13px] leading-snug text-[#6B6158]">{small}</p>
          </motion.li>
        ))}
      </ul>

      {/* Téléphone : les deux photos sous le texte. */}
      <div className="mx-auto mt-12 grid max-w-md grid-cols-2 gap-4 px-5 lg:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/site/photos/classe.jpg" alt="" loading="lazy" className="aspect-[4/5] w-full -rotate-3 rounded-[22px] object-cover" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/site/photos/eleves.jpg" alt="" loading="lazy" className="mt-8 aspect-[4/5] w-full rotate-3 rounded-[22px] object-cover" />
      </div>
    </section>
  );
}

/* ───────────────────────── Le film : il grandit au défilement ───────────────────────── */

export function Film() {
  const desktop = useDesktop();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [reduce ? 1 : 0.62, 1]);
  const radius = useTransform(scrollYProgress, [0, 1], [44, 28]);
  if (!desktop) {
    return (
      <section id="film" ref={ref} className="relative z-10 px-5 py-12">
        <Reveal>
          <HeroVideo />
        </Reveal>
      </section>
    );
  }
  return (
    <section id="film" ref={ref} className="relative z-10 h-[150svh]">
      <div className="sticky top-0 flex h-svh flex-col items-center justify-center overflow-hidden px-5">
        <motion.div style={{ scale, borderRadius: radius }} className="relative w-[min(1280px,94vw,calc((100svh-90px)*16/9))] origin-center overflow-hidden will-change-transform">
          <HeroVideo />
        </motion.div>
      </div>
    </section>
  );
}

/* ───────────────────────── Comment ça marche ───────────────────────── */

const STEPS = [
  { icon: Sun, title: "Ouvre la leçon du moment", text: "Chaque matin, ta journée est là : le cours en cours, les suivants et ta progression.", screen: "accueil" },
  { icon: FileText, title: "Lis et imprime ta fiche", text: "Objectifs, déroulement, exercices et corrigés au format A4. Prête à imprimer ou à partager.", screen: "lecteur" },
  { icon: ImagePlus, title: "Illustre-la en un geste", text: "Décris l’image voulue : tu reçois un brouillon, et tu choisis s’il entre dans ta fiche.", screen: "illustrations" },
  { icon: CloudDownload, title: "Garde tout hors ligne", text: "Télécharge la semaine d’un geste : tes fiches s’ouvrent en classe, sans réseau.", screen: "semaine" },
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
            src={`/site/app/${s.screen}.jpg`}
            alt={`Écran de l’app : ${s.title}`}
            width={780}
            height={1688}
            decoding="async"
            initial={{ opacity: 0, scale: 1.04, filter: "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
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
  const [open, setOpen] = useState(true);
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
  const auto = desktop && seen && !paused && open;
  useEffect(() => {
    if (!auto || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % STEPS.length), STEP_MS);
    return () => clearTimeout(t);
  }, [active, auto]);

  const select = (i: number) => {
    if (i === active) {
      setOpen(!open);
      return;
    }
    setActive(i);
    setOpen(true);
    if (desktop) return;
    setTimeout(() => {
      const top = items.current[i]?.getBoundingClientRect().top ?? 100;
      if (top < 84) window.scrollTo({ top: window.scrollY + top - 92, behavior: "smooth" });
    }, D.quick * 1000 + 40);
  };

  return (
    <section id="histoire" ref={ref} className="relative z-10 py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <h2 className={`${H2} max-w-2xl`}>Quatre gestes, et ta journée est prête.</h2>
        </Reveal>
        <div className="mt-12 grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]" onPointerEnter={(e) => e.pointerType === "mouse" && setPaused(true)} onPointerLeave={() => setPaused(false)}>
          <ol className="grid gap-2" role="tablist" aria-label="Étapes">
            {STEPS.map((s, i) => {
              const on = i === active && open;
              return (
                <li key={s.title} ref={(el) => void (items.current[i] = el)}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => select(i)}
                    className={`relative w-full overflow-hidden rounded-[22px] p-5 text-left transition-colors duration-300 ${on ? "bg-[#F7F5F1]" : "hover:bg-[#F7F5F1]/60"}`}
                  >
                    <div className="flex items-start gap-4">
                      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[14px] transition-colors duration-300 ${on ? "bg-[#1A8A4C] text-white" : "bg-[#EAE4DB] text-[#4A423B]"}`}>
                        <s.icon size={19} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="pt-2.5 text-[17px] font-bold leading-tight">{s.title}</h3>
                        <AnimatePresence initial={false}>
                          {on && (
                            <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: D.quick, ease: EASE }} className="overflow-hidden text-[15px] leading-relaxed text-[#6B6158]">
                              <span className="block pt-2">{s.text}</span>
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    {on && desktop && (
                      <span className="absolute inset-x-5 bottom-0 h-[3px] overflow-hidden rounded-full bg-[#1A8A4C]/10">
                        <span key={`${active}-${auto}`} className="block h-full origin-left bg-[#1A8A4C]" style={{ animation: auto ? `site-progress ${STEP_MS}ms linear both` : "none", transform: auto ? undefined : "scaleX(0)" }} />
                      </span>
                    )}
                  </button>
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
            <div className="relative">
              <div aria-hidden className="absolute left-1/2 top-1/2 h-[78%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-[48px] bg-[#EAE4DB]" />
              <div className={`relative mx-auto ${PHONE}`}>
                <StepPhone i={active} />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Fonctionnalités ───────────────────────── */

const FEATURES = [
  { title: "Ton programme, jour par jour", text: "Le calendrier du mois, les leçons faites et celles à venir.", img: "programme", bg: "#EAE4DB", pos: "50% 0%" },
  { title: "Toute la bibliothèque de ta classe", text: "Fiches, exercices, évaluations : par matière, prêtes à ouvrir.", img: "bibliotheque", bg: "#E3F2E9", pos: "50% 0%" },
  { title: "Le bilan en un geste", text: "Fait, pas fait ou reporté : la suite se recale toute seule.", img: "accueil", bg: "#FBEBD7", pos: "50% 0%" },
  { title: "Clair ou sombre", text: "PEDAGO suit le thème de ton téléphone, le soir comme en classe.", img: "sombre", bg: "#24211F", pos: "50% 0%", dark: true },
];

export function Features({ apkUrl }: { apkUrl: string | null }) {
  return (
    <section id="avantages" className="relative z-10 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <Reveal>
            <h2 className={`${H2} max-w-xl`}>Tout ce qu’il faut pour ta classe.</h2>
          </Reveal>
          <Reveal delay={0.06}>
            <DownloadButton apkUrl={apkUrl} className={PRIMARY} />
          </Reveal>
        </div>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <motion.li
              key={f.title}
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: D.slow, ease: EASE, delay: (i % 2) * 0.08 }}
              className="group relative flex h-[440px] flex-col overflow-hidden rounded-[32px] px-7 pt-7 sm:h-[480px] sm:px-9 sm:pt-9"
              style={{ background: f.bg }}
            >
              <h3 className={`font-display text-[26px] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[30px] ${f.dark ? "text-[#F5F2EC]" : "text-[#151515]"}`}>{f.title}</h3>
              <p className={`mt-2 max-w-[34ch] text-[15px] leading-relaxed ${f.dark ? "text-[#B9AFA4]" : "text-[#6B6158]"}`}>{f.text}</p>
              <div className="relative mx-auto mt-7 w-[min(78%,300px)] flex-1 translate-y-2 overflow-hidden rounded-t-[26px] shadow-[0_-10px_40px_-20px_rgba(0,0,0,.35)] ring-1 ring-black/5 transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:-translate-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/site/app/${f.img}.jpg`} alt={`Écran de l’app : ${f.title}`} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: f.pos }} />
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
