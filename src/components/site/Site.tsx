"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, ArrowUp, ChevronLeft, ChevronRight, Maximize2, Menu, Plus, ShieldCheck, Smartphone, X } from "lucide-react";
import { PedagoMark, PedagoWordmark } from "@/components/brand/PedagoMark";
import { Caption, CardFan, Lightbox, wrap } from "./CardFan";
import { Features, Film, Hero, HowItWorks, Why } from "./Sections";
import { D, DownloadButton, EASE, H2, Reveal, scrollToAnchor, type SiteUser } from "./ui";

const FAQ = [
  [
    "Installer un APK, c’est sûr ?",
    "Oui : c’est le fichier de l’application, signé par PEDAGO, le même que celui destiné au Play Store (publication en préparation). Android te demande une seule autorisation, pour ton navigateur.",
  ],
  ["Ça marche sans internet ?", "Oui. Une fois tes leçons téléchargées, tout s’ouvre et s’imprime hors connexion ; tes bilans partent quand le réseau revient."],
  [
    "Mes fiches restent-elles privées ?",
    "Oui. Elles sont rattachées à ton seul compte ; tu peux exporter ou supprimer toutes tes données depuis l’app. La lecture par l’IA se fait sans conservation des documents par le fournisseur.",
  ],
  ["Quelles classes sont couvertes ?", "Le primaire francophone (SIL au CM2) et anglophone (Class One à Six), selon les programmes officiels."],
  ["Et sur iPhone ?", "La version iPhone est en préparation. Ton compte fonctionne déjà sur le site."],
] as const;

const NAV = [
  ["#pourquoi", "Pourquoi PEDAGO"],
  ["#histoire", "Comment ça marche"],
  ["#film", "Le film"],
  ["#ecrans", "Écrans"],
  ["#questions", "Questions"],
] as const;

function Header({ user, apkUrl }: { user: SiteUser; apkUrl: string | null }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  // Menu ouvert : la page ne défile plus derrière ; Échap ou passage en grand écran le referment.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const prev = [root.style.overflow, document.body.style.overflow];
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const mq = window.matchMedia("(min-width: 1024px)");
    const onWide = () => mq.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onWide);
    return () => {
      [root.style.overflow, document.body.style.overflow] = prev;
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onWide);
    };
  }, [open]);
  const go = (href: string) => {
    setOpen(false);
    // Laisse le défilement revenir avant de partir vers la section.
    requestAnimationFrame(() => scrollToAnchor(href));
  };
  const account = user ? (
    <Link href={user.role === "teacher" ? "/compte" : "/dashboard"} className="inline-flex h-11 items-center gap-2 rounded-[12px] px-4 text-[15px] font-bold text-[#1A8A4C] hover:bg-[#E3F2E9]">
      {user.role === "teacher" ? "Mon espace" : "Tableau de bord"}
    </Link>
  ) : (
    <Link href="/connexion" className="inline-flex h-11 items-center rounded-[12px] px-4 text-[15px] font-bold text-[#1A8A4C] hover:bg-[#E3F2E9]">
      Se connecter
    </Link>
  );
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-2.5 sm:px-5">
      <div className={`mx-auto flex h-16 max-w-[1400px] items-center gap-2 rounded-[20px] pl-4 pr-2 transition-[background,box-shadow] duration-300 ${open ? "" : scrolled ? "site-glass" : ""}`}>
        <button type="button" onClick={() => go("#accueil")} aria-label="Haut de page" className="shrink-0">
          {/* Point d'atterrissage du logo de l'intro (SiteIntro). */}
          <PedagoWordmark className="brand-target scale-[1.15] origin-left" />
        </button>
        <nav className="ml-6 hidden flex-1 items-center gap-1 lg:flex" aria-label="Sections">
          {NAV.map(([href, label]) => (
            <button key={href} type="button" onClick={() => go(href)} className="rounded-[12px] px-3.5 py-2 text-[15px] font-semibold text-[#4A423B] transition-colors hover:bg-[#F7F5F1] hover:text-[#151515]">
              {label}
            </button>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-1 sm:flex">
          {account}
          <DownloadButton apkUrl={apkUrl} label="Télécharger" className="inline-flex h-12 items-center gap-2 rounded-[14px] bg-[#1A8A4C] px-5 text-[15px] font-bold text-white shadow-[0_10px_24px_-12px_rgba(26,138,76,.8)] transition-[background-color,transform] duration-300 hover:-translate-y-px hover:bg-[#157A43]" />
        </div>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="menu-mobile" aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} className="ml-auto grid h-11 w-11 place-items-center rounded-full hover:bg-black/5 sm:ml-1 lg:hidden">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            id="menu-mobile"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: D.quick, ease: EASE }}
            className="fixed inset-0 -z-10 flex flex-col overflow-y-auto overscroll-contain bg-white px-5 pb-8 pt-24 sm:px-8 lg:hidden"
          >
            <nav aria-label="Menu" className="flex flex-col">
              {NAV.map(([href, label], i) => (
                <motion.button
                  key={href}
                  type="button"
                  onClick={() => go(href)}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: D.base, ease: EASE, delay: 0.04 + i * 0.04 }}
                  className="flex items-center justify-between border-b border-black/[0.08] py-5 text-left text-[26px] font-semibold tracking-[-0.025em] text-[#171717]"
                >
                  {label}
                  <ArrowRight size={20} className="text-[#1A8A4C]" />
                </motion.button>
              ))}
            </nav>
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: D.base, ease: EASE, delay: 0.22 }} className="mt-auto flex flex-col gap-3 pt-10">
              <div onClick={() => setOpen(false)}>
                <DownloadButton apkUrl={apkUrl} label="Télécharger l’app" className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#1A8A4C] px-5 text-[16px] font-bold text-white" />
              </div>
              <div className="flex gap-3">
                {user ? (
                  <Link href={user.role === "teacher" ? "/compte" : "/dashboard"} className="flex h-14 flex-1 items-center justify-center rounded-full bg-white text-[15px] font-semibold text-[#171717] shadow-[0_0_0_1px_rgba(23,23,23,.1)]">
                    {user.role === "teacher" ? "Mon espace" : "Tableau de bord"}
                  </Link>
                ) : (
                  <>
                    <Link href="/connexion" className="flex h-14 flex-1 items-center justify-center rounded-full bg-white text-[15px] font-semibold text-[#171717] shadow-[0_0_0_1px_rgba(23,23,23,.1)]">
                      Se connecter
                    </Link>
                    <Link href="/inscription" className="flex h-14 flex-1 items-center justify-center rounded-full bg-white text-[15px] font-semibold text-[#171717] shadow-[0_0_0_1px_rgba(23,23,23,.1)]">
                      Créer un compte
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function DownloadSection({ card, user }: { card: ReactNode; user: SiteUser }) {
  const steps = [
    ["Télécharge l’APK", "Avec le bouton ci-dessus, ou en scannant le QR code avec ton téléphone Android."],
    ["Autorise l’installation", "À l’ouverture du fichier, Android le demande : touche « Paramètres », puis « Autoriser cette source » pour ton navigateur."],
    ["Installe PEDAGO", "Ouvre PEDAGO.apk depuis tes téléchargements et touche « Installer ». L’icône PEDAGO apparaît sur ton écran."],
    ["Connecte-toi", "Avec ton e-mail et ton mot de passe. Pas encore de compte ? Crée-le ici ou dans l’app, en une minute."],
  ];
  return (
    <section id="telecharger" className="relative z-10 py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <h2 className={`${H2} max-w-2xl`}>Installe PEDAGO en deux minutes.</h2>
        </Reveal>
        <Reveal className="mt-12">{card}</Reveal>
        <ol className="mt-12 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([t, d], i) => (
            <motion.li
              key={t}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: D.slow, ease: EASE, delay: i * 0.07 }}
              className="border-t-2 border-[#1A8A4C] pt-5"
            >
              <h3 className="text-[17px] font-semibold">
                <span className="mr-2 tabular-nums text-[#1A8A4C]">{i + 1}.</span>
                {t}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[#5c5c5c]">{d}</p>
            </motion.li>
          ))}
        </ol>
        <Reveal className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-[13.5px] text-[#5c5c5c]">
          <span className="flex items-center gap-2">
            <Smartphone size={16} /> Android 7 ou plus récent · environ 60 Mo libres
          </span>
          <span className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#1A8A4C]" /> Export et suppression de tes données à tout moment
          </span>
          {!user && (
            <Link href="/inscription" className="font-semibold text-[#171717] underline-offset-4 hover:underline">
              Créer mon compte maintenant
            </Link>
          )}
        </Reveal>
      </div>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="questions" className="relative z-10 py-24">
      <div className="mx-auto max-w-3xl px-5">
        <Reveal>
          <h2 className={H2}>Questions fréquentes</h2>
        </Reveal>
        <div className="mt-10 divide-y divide-black/[0.08] border-y border-black/[0.08]">
          {FAQ.map(([q, a], i) => {
            const on = open === i;
            return (
              <div key={q}>
                <h3>
                  <button type="button" onClick={() => setOpen(on ? null : i)} aria-expanded={on} className="flex w-full items-center justify-between gap-4 py-5 text-left text-[16.5px] font-semibold">
                    {q}
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition-all duration-300 ${on ? "rotate-45 bg-[#1A8A4C] text-white" : "bg-[#F7F5F1]"}`} aria-hidden>
                      <Plus size={16} />
                    </span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {on && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: D.quick, ease: EASE }} className="overflow-hidden">
                      <p className="pb-5 text-[15px] leading-relaxed text-[#4a4a4a]">{a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const FOOT_NAV = [
  ["#accueil", "Accueil"],
  ["#histoire", "Comment ça marche"],
  ["#film", "Le film"],
  ["#telecharger", "Télécharger"],
  ["#questions", "Questions"],
] as const;

/** Pied de page : deux grands mots, l'éventail des vrais écrans de l'app entre les deux, puis l'appel au téléchargement. */
function Footer({ user, apkUrl }: { user: SiteUser; apkUrl: string | null }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const word = (from: number) => ({
    initial: { opacity: 0, x: reduce ? 0 : from },
    whileInView: { opacity: 1, x: 0 },
    viewport: { once: true, margin: "-10% 0px" },
    transition: { duration: 1.1, ease: EASE },
  });
  return (
    <footer id="ecrans" className="relative z-10 mt-10 overflow-hidden bg-[#151515] text-white">
      <div className="mx-auto max-w-[1400px] px-5 pb-10 pt-20 sm:px-10 sm:pt-28">
        <div
          className="relative flex flex-col sm:h-[var(--fan-h)] sm:flex-row sm:items-center sm:justify-between [--card:clamp(112px,15vw,214px)] [--fan-h:calc(var(--card)*2.45)] [--spread:clamp(20px,3.1vw,46px)]"
          aria-label="Écrans de l’app PEDAGO"
        >
          <div className="flex items-end justify-between sm:contents">
          <motion.span {...word(-120)} aria-hidden className="font-display relative z-0 select-none text-[clamp(44px,12.4vw,184px)] sm:text-[clamp(54px,11.5vw,184px)] font-extrabold uppercase leading-[0.8] tracking-[-0.02em] text-[#2BB36A] [font-variation-settings:'wdth'_75]">
            Classe
          </motion.span>
          <motion.span {...word(120)} aria-hidden className="font-display relative z-0 select-none text-[clamp(44px,12.4vw,184px)] sm:text-[clamp(54px,11.5vw,184px)] font-extrabold uppercase leading-[0.8] tracking-[-0.02em] text-white [font-variation-settings:'wdth'_75]">
            Prête
          </motion.span>
          </div>
          <div className="relative z-10 -mt-4 h-[var(--fan-h)] sm:absolute sm:inset-0 sm:mt-0 sm:h-auto">
            <CardFan active={active} setActive={setActive} onOpen={setZoom} />
          </div>
        </div>
        <Caption index={active} className="mt-6" />
        <div className="mt-4 flex justify-center gap-2">
          <button type="button" onClick={() => setActive(wrap(active - 1))} aria-label="Écran précédent" className="grid h-11 w-11 place-items-center rounded-full ring-1 ring-white/20 transition-colors hover:bg-white/10">
            <ChevronLeft size={19} />
          </button>
          <button type="button" onClick={() => setZoom(active)} className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14px] font-semibold ring-1 ring-white/20 transition-colors hover:bg-white/10">
            <Maximize2 size={15} /> Agrandir
          </button>
          <button type="button" onClick={() => setActive(wrap(active + 1))} aria-label="Écran suivant" className="grid h-11 w-11 place-items-center rounded-full ring-1 ring-white/20 transition-colors hover:bg-white/10">
            <ChevronRight size={19} />
          </button>
        </div>

        <div className="mt-20 flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-[46ch] text-[13.5px] font-medium uppercase leading-[1.7] tracking-[0.02em] text-white/75">
            Tes leçons, tes fiches et ton bilan dans ta poche. Prêts chaque matin, même sans réseau.
          </p>
          <DownloadButton
            apkUrl={apkUrl}
            label="Télécharger PEDAGO"
            className="inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-white/[0.04] px-7 text-[15px] font-semibold text-white ring-1 ring-white/25 transition-[background-color,box-shadow] duration-300 hover:bg-[#1A8A4C] hover:ring-[#1A8A4C] sm:w-[min(420px,40vw)]"
          />
        </div>
        <div className="mt-10 border-t border-dashed border-white/20" />
        <nav aria-label="Pied de page" className="mt-8 flex flex-wrap justify-between gap-x-6 gap-y-4">
          {FOOT_NAV.map(([h, l]) => (
            <button key={h} type="button" onClick={() => scrollToAnchor(h)} className="text-[14px] font-medium uppercase tracking-[0.04em] text-white/85 transition-colors hover:text-[#2BB36A]">
              {l}
            </button>
          ))}
        </nav>
        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 text-[12.5px] text-white/45">
          <span className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-white">
              <PedagoMark size={17} />
            </span>
            © {new Date().getFullYear()} PEDAGO · Fait au Cameroun
          </span>
          <span className="flex gap-5">
            {user ? (
              <Link href={user.role === "teacher" ? "/compte" : "/dashboard"} className="hover:text-white">
                {user.role === "teacher" ? "Mon espace" : "Tableau de bord"}
              </Link>
            ) : (
              <>
                <Link href="/connexion" className="hover:text-white">
                  Se connecter
                </Link>
                <Link href="/inscription" className="hover:text-white">
                  Créer un compte
                </Link>
              </>
            )}
          </span>
        </div>
      </div>
      <Lightbox index={zoom} onClose={() => { if (zoom !== null) setActive(zoom); setZoom(null); }} onMove={(d) => setZoom((z) => (z === null ? z : wrap(z + d)))} />
    </footer>
  );
}

/** Retour en haut : apparaît après l'accueil, en bas à droite. */
function ScrollTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let frame = 0;
    const on = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setShow(window.scrollY > window.innerHeight * 0.9));
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", on);
    };
  }, []);
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          onClick={() => scrollToAnchor("#accueil")}
          aria-label="Revenir en haut de la page"
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.9 }}
          transition={{ duration: D.quick, ease: EASE }}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.94 }}
          className="fixed bottom-5 right-5 z-40 grid h-12 w-12 place-items-center rounded-full bg-[#171717] text-white shadow-[0_12px_28px_-12px_rgba(23,23,23,.7)]"
        >
          <ArrowUp size={20} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export function Site({ user, apkUrl, downloadCard }: { user: SiteUser; apkUrl: string | null; downloadCard: ReactNode }) {
  return (
    <div className="site relative">
            <Header user={user} apkUrl={apkUrl} />
      <main>
        <Hero apkUrl={apkUrl} />
        <Why />
        <Film />
        <HowItWorks />
        <Features apkUrl={apkUrl} />
        <DownloadSection card={downloadCard} user={user} />
        <Faq />
      </main>
      <Footer user={user} apkUrl={apkUrl} />
      <ScrollTop />
    </div>
  );
}
