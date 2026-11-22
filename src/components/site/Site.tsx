"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, ArrowUp, Menu, Plus, ShieldCheck, Smartphone, X } from "lucide-react";
import { PedagoMark, PedagoWordmark } from "@/components/brand/PedagoMark";
import { Benefits, Compare, Gallery, Hero, HowItWorks } from "./Sections";
import { D, DownloadButton, EASE, H2, Reveal, scrollToAnchor, type SiteUser } from "./ui";

const FAQ = [
  ["Est-ce vraiment gratuit ?", "Oui. PEDAGO est gratuit pour les enseignants : ni abonnement, ni publicité."],
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
  ["#histoire", "Comment ça marche"],
  ["#avant-apres", "Avant · après"],
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
    <Link href={user.role === "teacher" ? "/compte" : "/dashboard"} className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-[14px] font-semibold text-[#171717] hover:bg-black/5">
      {user.role === "teacher" ? "Mon espace" : "Tableau de bord"}
    </Link>
  ) : (
    <Link href="/connexion" className="inline-flex h-11 items-center rounded-full px-4 text-[14px] font-semibold text-[#171717] hover:bg-black/5">
      Se connecter
    </Link>
  );
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
      <div className={`mx-auto flex h-16 max-w-6xl items-center gap-2 rounded-full pl-5 pr-2.5 transition-[background,box-shadow] duration-300 ${open ? "" : scrolled ? "site-glass" : ""}`}>
        <button type="button" onClick={() => go("#accueil")} aria-label="Haut de page" className="shrink-0">
          {/* Point d'atterrissage du logo de l'intro (SiteIntro). */}
          <PedagoWordmark className="brand-target" />
        </button>
        <nav className="ml-6 hidden flex-1 items-center gap-1 lg:flex" aria-label="Sections">
          {NAV.map(([href, label]) => (
            <button key={href} type="button" onClick={() => go(href)} className="rounded-full px-3.5 py-2 text-[14px] font-medium text-[#3d3d3d] transition-colors hover:bg-black/5 hover:text-[#171717]">
              {label}
            </button>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-1 sm:flex">
          {account}
          <DownloadButton apkUrl={apkUrl} label="Télécharger" className="inline-flex h-11 items-center gap-2 rounded-full bg-[#171717] px-5 text-[14px] font-semibold text-white" />
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
            className="fixed inset-0 -z-10 flex flex-col overflow-y-auto overscroll-contain bg-[#fafaf7] px-5 pb-8 pt-24 sm:px-8 lg:hidden"
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
                  <ArrowRight size={20} className="text-[#1F7A4D]" />
                </motion.button>
              ))}
            </nav>
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: D.base, ease: EASE, delay: 0.22 }} className="mt-auto flex flex-col gap-3 pt-10">
              <div onClick={() => setOpen(false)}>
                <DownloadButton apkUrl={apkUrl} label="Télécharger l’app" className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#171717] px-5 text-[16px] font-semibold text-white" />
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
              className="border-t-2 border-[#171717] pt-5"
            >
              <h3 className="text-[17px] font-semibold">
                <span className="mr-2 tabular-nums text-[#1F7A4D]">{i + 1}.</span>
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
            <ShieldCheck size={16} className="text-[#1F7A4D]" /> Export et suppression de tes données à tout moment
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
    <section id="questions" className="relative z-10 bg-white py-24">
      <div className="mx-auto max-w-3xl px-5">
        <Reveal>
          <h2 className="text-[34px] font-semibold leading-[1.04] tracking-[-0.035em] sm:text-[46px]">Questions fréquentes</h2>
        </Reveal>
        <div className="mt-10 divide-y divide-black/[0.08] border-y border-black/[0.08]">
          {FAQ.map(([q, a], i) => {
            const on = open === i;
            return (
              <div key={q}>
                <h3>
                  <button type="button" onClick={() => setOpen(on ? null : i)} aria-expanded={on} className="flex w-full items-center justify-between gap-4 py-5 text-left text-[16.5px] font-semibold">
                    {q}
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition-all duration-300 ${on ? "rotate-45 bg-[#1F7A4D] text-white" : "bg-black/5"}`} aria-hidden>
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

function FinalCta({ user, apkUrl }: { user: SiteUser; apkUrl: string | null }) {
  return (
    <section id="rejoindre" className="relative z-10 overflow-hidden bg-[#171717] py-28 text-white">
      <div aria-hidden className="absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-[#1F7A4D] opacity-40 blur-[120px]" />
      <div className="relative mx-auto max-w-6xl px-5">
        <Reveal>
          <span className="grid h-16 w-16 place-items-center rounded-[18px] bg-white shadow-[0_12px_30px_-12px_rgba(0,0,0,.5)]">
            <PedagoMark size={40} />
          </span>
          <h2 className="mt-6 max-w-3xl text-[40px] font-semibold leading-[1] tracking-[-0.04em] text-white sm:text-[64px]">Prêt pour demain matin ?</h2>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-white/70">Télécharge PEDAGO, photographie ta prochaine fiche, et vois-la revenir prête à imprimer.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <DownloadButton apkUrl={apkUrl} className="inline-flex h-14 items-center gap-2.5 rounded-full bg-white px-7 text-[16px] font-semibold text-[#171717] transition-transform duration-300 hover:-translate-y-0.5" />
            {!user && (
              <Link href="/inscription" className="inline-flex h-14 items-center gap-2 rounded-full px-7 text-[16px] font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,.25)] transition-colors hover:bg-white/10">
                Créer un compte <ArrowRight size={17} />
              </Link>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer({ user }: { user: SiteUser }) {
  return (
    <footer className="relative z-10">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <PedagoWordmark />
          <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-[#5c5c5c]">L’assistant de classe des enseignants du primaire au Cameroun.</p>
        </div>
        <nav aria-label="Pied de page" className="flex flex-col gap-2.5 text-[14px]">
          {[
            ["#histoire", "Comment ça marche"],
            ["#avant-apres", "Avant · après"],
            ["#telecharger", "Télécharger l’app"],
            ["#questions", "Questions fréquentes"],
          ].map(([h, l]) => (
            <button key={h} type="button" onClick={() => scrollToAnchor(h)} className="w-fit text-left text-[#3d3d3d] hover:text-[#171717]">
              {l}
            </button>
          ))}
        </nav>
        <div className="flex flex-col gap-2.5 text-[14px]">
          {user ? (
            <Link href={user.role === "teacher" ? "/compte" : "/dashboard"} className="w-fit text-[#3d3d3d] hover:text-[#171717]">
              {user.role === "teacher" ? "Mon espace" : "Tableau de bord"}
            </Link>
          ) : (
            <>
              <Link href="/connexion" className="w-fit text-[#3d3d3d] hover:text-[#171717]">
                Se connecter
              </Link>
              <Link href="/inscription" className="w-fit text-[#3d3d3d] hover:text-[#171717]">
                Créer un compte
              </Link>
            </>
          )}
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 pb-8 text-[12.5px] text-[#7a7a7a]">
        <span>© {new Date().getFullYear()} PEDAGO · Fait au Cameroun</span>
        <PedagoMark size={20} />
      </div>
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
      <div className="site-aurora" aria-hidden />
      <Header user={user} apkUrl={apkUrl} />
      <main>
        <Hero apkUrl={apkUrl} />
        <HowItWorks />
        <Compare />
        <Benefits apkUrl={apkUrl} />
        <Gallery />
        <DownloadSection card={downloadCard} user={user} />
        <Faq />
        <FinalCta user={user} apkUrl={apkUrl} />
      </main>
      <Footer user={user} />
      <ScrollTop />
    </div>
  );
}
