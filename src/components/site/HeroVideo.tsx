"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { Maximize, Minimize, Pause, Play, Volume1, Volume2, VolumeX } from "lucide-react";
import type { SiteMedia } from "@/lib/server/site-media";

type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => void };

const fmt = (s: number) => {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

const HIDE_AFTER_MS = 3000;

const noSubscribe = () => () => undefined;
// iPhone / iPad : le volume d'une vidéo n'est pas réglable par la page (seulement par les boutons du téléphone).
const volumeSettable = () => {
  const a = document.createElement("audio");
  a.volume = 0.5;
  return a.volume === 0.5;
};
const coarseQuery = "(pointer: coarse)";
const subscribeCoarse = (cb: () => void) => {
  const mq = window.matchMedia(coarseQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/**
 * Le film de présentation : la pub PEDAGO de 60 s, avec musique et bruitages.
 * - Jamais de lecture automatique, et rien n'est téléchargé avant le clic (preload="none" + affiche légère).
 * - Un clic sur l'image affiche ou masque la barre de commandes ; elle disparaît seule 3 s après, pendant la lecture.
 * - Plein écran : natif sur ordinateur ; sur téléphone, une page noire au-dessus du site, vidéo en pleine largeur.
 *   Le lecteur vit dans un « hôte » rendu par portail : on déplace cet hôte (sans recréer la vidéo, donc sans
 *   couper la lecture) entre sa place dans la page et la page noire, hors des parents animés (transform).
 */
/** Vidéos et affiche sur UploadThing (adresses en base) : 720p pour les petits écrans, 1080p au-delà ; WebM d'abord, MP4 pour Safari / iPhone. */
export function HeroVideo({ media }: { media: SiteMedia }) {
  const POSTER = media.poster;
  const DURATION = media.durationSec;
  const slot = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const scrubbing = useRef(false);
  const volBar = useRef<HTMLDivElement>(null);
  const volDragging = useRef(false);

  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [volOpen, setVolOpen] = useState(false); // curseur ouvert au toucher (téléphone)
  const [barOn, setBarOn] = useState(true);
  const [full, setFull] = useState(false); // plein écran natif (ordinateur)
  const [page, setPage] = useState(false); // page noire (téléphone)
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(DURATION);
  const coarse = useSyncExternalStore(subscribeCoarse, () => window.matchMedia(coarseQuery).matches, () => false);
  const canSetVolume = useSyncExternalStore(noSubscribe, volumeSettable, () => true);

  // Hôte du lecteur et page noire : créés côté navigateur, après l'hydratation (le serveur rend l'affiche seule).
  const mounted = useSyncExternalStore(noSubscribe, () => true, () => false);
  const host = useMemo(() => (mounted ? document.createElement("div") : null), [mounted]);
  const overlay = useMemo(() => {
    if (!mounted) return null;
    const o = document.createElement("div");
    o.setAttribute("role", "dialog");
    o.setAttribute("aria-modal", "true");
    o.setAttribute("aria-label", "Vidéo en plein écran");
    // Colonne centrée : le lecteur prend toute la largeur, sa hauteur suit (16:9).
    o.style.cssText = "position:fixed;inset:0;z-index:2147483000;background:#000;display:flex;flex-direction:column;justify-content:center";
    return o;
  }, [mounted]);
  useEffect(
    () => () => {
      host?.remove();
      overlay?.remove();
    },
    [host, overlay]
  );

  // Place l'hôte : dans la page, ou dans la page noire (et bloque alors le défilement du site).
  useLayoutEffect(() => {
    if (!host || !overlay) return;
    if (page) {
      document.body.appendChild(overlay);
      overlay.appendChild(host);
      const prev = document.documentElement.style.overflow;
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.documentElement.style.overflow = prev;
      };
    }
    slot.current?.appendChild(host);
    overlay.remove();
  }, [host, overlay, page]);

  // Remplissage de la barre : écrit directement dans le DOM, seulement pendant la lecture.
  const paint = useCallback(() => {
    const v = video.current;
    if (v && fill.current && v.duration > 0 && Number.isFinite(v.duration)) fill.current.style.transform = `scaleX(${Math.min(1, v.currentTime / v.duration)})`;
  }, []);
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      paint();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, paint]);

  // La barre se cache seule 3 s après la dernière action, pendant la lecture.
  const poke = useCallback(() => {
    window.clearTimeout(hideTimer.current);
    setBarOn(true);
    hideTimer.current = window.setTimeout(() => !scrubbing.current && setBarOn(false), HIDE_AFTER_MS);
  }, []);
  useEffect(() => {
    window.clearTimeout(hideTimer.current);
    if (playing && barOn) hideTimer.current = window.setTimeout(() => !scrubbing.current && setBarOn(false), HIDE_AFTER_MS);
    return () => window.clearTimeout(hideTimer.current);
  }, [playing, barOn]);

  // Jamais de lecture automatique : on met seulement en pause quand la vidéo sort de l'écran (hors page noire).
  useEffect(() => {
    const v = video.current;
    if (!v || page) return;
    const io = new IntersectionObserver(([e]) => !e.isIntersecting && v.pause(), { threshold: 0.3 });
    io.observe(v);
    return () => io.disconnect();
  }, [page, host]);

  useEffect(() => {
    const on = () => {
      const d = document as FsDoc;
      setFull(Boolean(d.fullscreenElement ?? d.webkitFullscreenElement));
    };
    document.addEventListener("fullscreenchange", on);
    document.addEventListener("webkitfullscreenchange", on);
    return () => {
      document.removeEventListener("fullscreenchange", on);
      document.removeEventListener("webkitfullscreenchange", on);
    };
  }, []);

  // Échap ferme la page noire.
  useEffect(() => {
    if (!page) return;
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && setPage(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [page]);

  const play = () => {
    const v = video.current;
    if (!v) return;
    setStarted(true);
    void v.play().catch(() => undefined);
    poke();
  };
  const togglePlay = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) play();
    else {
      v.pause();
      poke();
    }
  };
  const toggleMute = () => {
    const v = video.current;
    if (!v) return;
    v.muted = !v.muted;
    if (!v.muted && v.volume === 0) v.volume = 0.5;
    setMuted(v.muted);
    setVolume(v.volume);
    poke();
  };
  // Volume : 0 à 1 ; le monter enlève la coupure du son, le descendre à 0 la remet.
  const applyVolume = (x: number) => {
    const v = video.current;
    if (!v) return;
    const val = Math.round(Math.min(1, Math.max(0, x)) * 100) / 100;
    v.volume = val;
    v.muted = val === 0;
    setVolume(val);
    setMuted(v.muted);
  };
  const volFrom = (clientX: number) => {
    const r = volBar.current?.getBoundingClientRect();
    if (r && r.width > 0) applyVolume((clientX - r.left) / r.width);
  };
  const onVolDown = (e: PointerEvent<HTMLDivElement>) => {
    volDragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    volFrom(e.clientX);
    poke();
  };
  const onVolMove = (e: PointerEvent<HTMLDivElement>) => volDragging.current && volFrom(e.clientX);
  const onVolUp = () => {
    volDragging.current = false;
    poke();
  };
  const onVolKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowUp" ? 0.1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -0.1 : 0;
    if (!step) return;
    e.preventDefault();
    const v = video.current;
    if (v) applyVolume((v.muted ? 0 : v.volume) + step);
    poke();
  };
  // Icône du son : sur ordinateur elle coupe / remet le son (le curseur s'ouvre au survol) ;
  // au toucher, elle ouvre / ferme le curseur.
  const onVolumeButton = () => {
    if (coarse && canSetVolume) {
      setVolOpen((o) => !o);
      poke();
    } else toggleMute();
  };

  // Clic sur l'image : affiche ou masque la barre (la lecture se commande par les boutons).
  const onSurface = () => {
    if (!started) return play();
    if (barOn) {
      window.clearTimeout(hideTimer.current);
      setBarOn(false);
    } else poke();
  };

  const seekTo = (clientX: number) => {
    const v = video.current;
    const r = bar.current?.getBoundingClientRect();
    if (!v || !r || !v.duration) return;
    v.currentTime = Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * v.duration;
    setTime(v.currentTime);
    paint();
  };
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    scrubbing.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    seekTo(e.clientX);
    poke();
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => scrubbing.current && seekTo(e.clientX);
  const onUp = () => {
    scrubbing.current = false;
    poke();
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const v = video.current;
    if (!v) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      v.currentTime = Math.min(v.duration, Math.max(0, v.currentTime + (e.key === "ArrowRight" ? 5 : -5)));
      setTime(v.currentTime);
      paint();
      poke();
    }
  };

  const fullscreen = () => {
    poke();
    if (coarse) return setPage((p) => !p);
    const d = document as FsDoc;
    if (d.fullscreenElement ?? d.webkitFullscreenElement) {
      if (d.exitFullscreen) void d.exitFullscreen();
      else d.webkitExitFullscreen?.();
      return;
    }
    const el = wrap.current as FsEl | null;
    if (el?.requestFullscreen) void el.requestFullscreen().catch(() => undefined);
    else el?.webkitRequestFullscreen?.();
  };

  const expanded = full || page;
  const showBar = started && barOn;
  const btn = "grid h-10 w-10 shrink-0 place-items-center rounded-full text-white transition-colors hover:bg-white/15 active:bg-white/25";

  const player = (
    <div
      ref={wrap}
      className={`group/video relative overflow-hidden ${
        page ? "w-full rounded-none bg-black" : "rounded-[28px] bg-[#e9e4da] shadow-[0_40px_80px_-40px_rgba(23,23,23,.5)]"
      } [&:fullscreen]:flex [&:fullscreen]:items-center [&:fullscreen]:rounded-none [&:fullscreen]:bg-black ${playing && !barOn ? "cursor-none" : ""}`}
    >
      <video
        ref={video}
        className={`block aspect-video w-full bg-black object-contain ${full ? "!aspect-auto !h-full" : ""}`}
        poster={POSTER}
        playsInline
        preload="none"
        aria-label="Pub PEDAGO de 60 secondes, avec musique : la journée prête le matin, la fiche photographiée, les cours, exercices et évaluations en PDF, le programme, le bilan, la bibliothèque hors connexion"
        onClick={onSurface}
        onPlay={() => setPlaying(true)}
        onPause={() => {
          // À la pause (ou à la fin), la barre revient pour qu'on puisse relancer.
          setPlaying(false);
          setBarOn(true);
        }}
        onVolumeChange={(e) => {
          setMuted(e.currentTarget.muted);
          setVolume(e.currentTarget.volume);
        }}
        onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onSeeked={paint}
      >
        {media.sources.map((s) => (
          <source key={s.url} src={s.url} type={s.type} media={s.maxWidth ? `(max-width: ${s.maxWidth}px)` : undefined} />
        ))}
      </video>

      {!started && (
        <button
          type="button"
          onClick={play}
          aria-label="Lire la pub avec le son"
          className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[#171717] shadow-[0_20px_40px_-12px_rgba(0,0,0,.5)] transition-transform hover:scale-105 active:scale-95 sm:h-24 sm:w-24"
        >
          <Play size={26} fill="currentColor" className="translate-x-0.5" />
        </button>
      )}

      <div
        hidden={!started}
        onPointerDown={poke}
        className={`absolute inset-x-3 bottom-3 flex items-center gap-1 rounded-full bg-[#171717]/55 p-1.5 pr-2 backdrop-blur-md transition-opacity duration-300 sm:inset-x-4 sm:bottom-4 ${
          showBar ? "opacity-100" : "pointer-events-none opacity-0 has-[:focus-visible]:pointer-events-auto has-[:focus-visible]:opacity-100"
        }`}
      >
        <button type="button" onClick={togglePlay} aria-label={playing ? "Mettre en pause" : "Lire la vidéo"} className={btn}>
          {playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" className="translate-x-px" />}
        </button>
        <div
          ref={bar}
          role="slider"
          tabIndex={0}
          aria-label="Position dans la vidéo"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(time)}
          aria-valuetext={`${fmt(time)} sur ${fmt(duration)}`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onKeyDown={onKey}
          className="group/bar relative flex h-10 flex-1 cursor-pointer touch-none items-center rounded-full px-1"
        >
          <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/25 transition-[height] duration-200 group-hover/bar:h-1.5">
            <div ref={fill} className="absolute inset-0 origin-left rounded-full bg-white will-change-transform" style={{ transform: "scaleX(0)" }} />
          </div>
        </div>
        <span className="w-9 text-right text-[12px] font-medium tabular-nums text-white/85">{fmt(time)}</span>
        <div className="group/vol flex items-center">
          <button
            type="button"
            onClick={onVolumeButton}
            aria-label={coarse && canSetVolume ? "Régler le volume" : muted ? "Activer le son" : "Couper le son"}
            aria-pressed={coarse && canSetVolume ? volOpen : muted}
            className={btn}
          >
            {muted || volume === 0 ? <VolumeX size={18} /> : volume < 0.5 ? <Volume1 size={18} /> : <Volume2 size={18} />}
          </button>
          {canSetVolume && (
            <div
              className={`overflow-hidden transition-[width] duration-200 ease-out ${
                volOpen ? "w-20" : "w-0 group-hover/vol:w-20 group-has-[:focus-visible]/vol:w-20"
              }`}
            >
              <div
                ref={volBar}
                role="slider"
                tabIndex={0}
                aria-label="Volume"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round((muted ? 0 : volume) * 100)}
                aria-valuetext={`Volume ${Math.round((muted ? 0 : volume) * 100)} %`}
                onPointerDown={onVolDown}
                onPointerMove={onVolMove}
                onPointerUp={onVolUp}
                onPointerCancel={onVolUp}
                onKeyDown={onVolKey}
                className="relative mx-2 flex h-10 w-16 cursor-pointer touch-none items-center"
              >
                <div className="relative h-1 w-full rounded-full bg-white/25">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${(muted ? 0 : volume) * 100}%` }} />
                  <div
                    className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow"
                    style={{ left: `${(muted ? 0 : volume) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        <button type="button" onClick={fullscreen} aria-label={expanded ? "Quitter le plein écran" : "Plein écran"} className={btn}>
          {expanded ? <Minimize size={17} /> : <Maximize size={17} />}
        </button>
      </div>
    </div>
  );

  return (
    // La place du lecteur dans la page : garde sa hauteur quand le lecteur part dans la page noire.
    <div ref={slot} className={page ? "aspect-video w-full rounded-[28px] bg-[#e9e4da]" : undefined}>
      {!host && (
        // Avant l'hydratation : l'affiche seule, à la bonne taille (pas de saut de mise en page).
        // eslint-disable-next-line @next/next/no-img-element
        <img src={POSTER} alt="" className="block aspect-video w-full rounded-[28px] bg-black object-cover" />
      )}
      {host && createPortal(player, host)}
    </div>
  );
}
