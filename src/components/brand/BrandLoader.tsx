/**
 * Loaders de la marque, en CSS pur (rendus par le serveur, animés avant même le chargement du JavaScript).
 * Les animations sont dans globals.css (préfixe `brand-`).
 */

// Avant le premier affichage : intro déjà vue dans cette session → on ne la rejoue pas (visite rapide).
const SEEN_SCRIPT = `try{if(sessionStorage.getItem("pedago-intro")){document.documentElement.dataset.intro="seen"}else{sessionStorage.setItem("pedago-intro","1")}}catch(e){}`;

/**
 * Intro du site (≈ 5 s, une fois par session) — la même que celle de l'app mobile : un petit carré grandit,
 * quatre lignes de guidage traversent la page, il se scinde en quatre tuiles qui pivotent, puis se resserrent
 * en monogramme (la tuile haut-droite devient la panse verte du « P ») ; le monogramme glisse et « pedago »
 * se révèle. Pour finir, le logo vole se poser exactement sur celui de la barre du haut et le voile s'efface.
 */
export function SiteIntro() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SEEN_SCRIPT }} />
      <div className="brand-intro" aria-hidden>
        <div className="brand-intro__veil" />
        <div className="brand-intro__stage">
          <div className="brand-intro__guides">
            <span className="brand-intro__guide brand-intro__guide--h brand-intro__guide--a" />
            <span className="brand-intro__guide brand-intro__guide--h brand-intro__guide--b" />
            <span className="brand-intro__guide brand-intro__guide--v brand-intro__guide--a" />
            <span className="brand-intro__guide brand-intro__guide--v brand-intro__guide--b" />
          </div>
          <div className="brand-intro__mark">
            <span className="brand-intro__tile brand-intro__tile--0" />
            <span className="brand-intro__tile brand-intro__tile--1" />
            <span className="brand-intro__tile brand-intro__tile--2" />
            <span className="brand-intro__tile brand-intro__tile--3" />
          </div>
          <span className="brand-intro__word">pedago</span>
        </div>
      </div>
    </>
  );
}

// Point d'atterrissage : le logo de l'intro (monogramme 36 px, mot à 16,5 px) doit tomber pile sur celui de la
// barre. On mesure le monogramme de la barre et on règle sur <html> :
//  --intro-shift  glissement du monogramme pour centrer « monogramme + mot » ;
//  --fly-x/y/s    vol final (centre sur centre, échelle = monogramme dessiné de la barre ÷ 36 px).
// Largeur et hauteur visibles (clientWidth/Height) : sans la barre de défilement, comme le calque fixe de l'intro.
// Refait quand les polices sont chargées (largeur du mot) et au redimensionnement.
const FLY_SCRIPT = `(function(){var d=document,h=d.documentElement;function place(){var t=d.querySelector(".brand-target svg"),w=d.querySelector(".brand-intro__word");if(!t||!w)return;var r=t.getBoundingClientRect();if(!r.height)return;var s=r.height*0.9/36,shift=(36+16.5+w.offsetWidth)/2-18;h.style.setProperty("--intro-shift",shift+"px");h.style.setProperty("--fly-x",(r.left+r.width/2-h.clientWidth/2+s*shift)+"px");h.style.setProperty("--fly-y",(r.top+r.height/2-h.clientHeight/2)+"px");h.style.setProperty("--fly-s",String(s));}place();try{d.fonts.ready.then(place)}catch(e){}addEventListener("resize",place);setTimeout(function(){removeEventListener("resize",place)},6000);})();`;

/** À placer après la barre du haut : calcule le point d'atterrissage du logo de l'intro. */
export function SiteIntroLanding() {
  return <script dangerouslySetInnerHTML={{ __html: FLY_SCRIPT }} />;
}

/** Chargement entre deux pages : le monogramme dont les tuiles s'allument en cascade. */
export function RouteLoader({ label = "Chargement" }: { label?: string }) {
  return (
    <div className="grid min-h-[60dvh] place-items-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <div className="brand-pulse" aria-hidden>
          <span className="brand-pulse__tile brand-pulse__tile--0" />
          <span className="brand-pulse__tile brand-pulse__tile--1" />
          <span className="brand-pulse__tile brand-pulse__tile--2" />
        </div>
        <span className="text-[13px] font-medium text-[var(--ink-2)]">{label}…</span>
      </div>
    </div>
  );
}
