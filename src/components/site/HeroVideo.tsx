"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent } from "react";
import { Maximize, Minimize, Pause, Play } from "lucide-react";

type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => void };
type IosVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

const fmt = (s: number) => {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

// Deux montages : 16:9 pour les écrans larges, 4:5 (texte au-dessus du téléphone) pour les téléphones.
const FILMS = {
  wide: { src: "/site/film.webm", poster: "/site/film.webp" },
  tall: { src: "/site/film-m.webm", poster: "/site/film-m.webp" },
};
const tallQuery = "(max-width: 640px)";
const subscribeTall = (cb: () => void) => {
  const mq = window.matchMedia(tallQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/**
 * Le film de présentation (≈ 70 s) : clip Veo d'ouverture, six chapitres filmés dans l'app, puis le clip
 * à l'envers, qui retombe sur la première image (boucle sans raccord). Lecture muette et en boucle tant
 * qu'il est à l'écran ; commandes maison (lecture, barre de progression, plein écran).
 */
export function HeroVideo() {
  const wrap = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [full, setFull] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(70);
  const tall = useSyncExternalStore(subscribeTall, () => window.matchMedia(tallQuery).matches, () => false);
  const film = tall ? FILMS.tall : FILMS.wide;
  const userPaused = useRef(false);
  const scrubbing = useRef(false);

  // Remplissage de la barre : écrit directement dans le DOM (aucun rendu React par image).
  const paint = () => {
    const v = video.current;
    if (v && fill.current && v.duration > 0 && Number.isFinite(v.duration)) fill.current.style.transform = `scaleX(${Math.min(1, v.currentTime / v.duration)})`;
  };
  // Progression fluide : à chaque image pendant la lecture, et aussi à chaque saut ou mise à jour du temps.
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      paint();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Lecture seulement à l'écran (et jamais d'office si la personne a demandé moins d'animations).
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) v.pause();
        else if (!userPaused.current && !reduced) void v.play().catch(() => undefined);
      },
      { threshold: 0.3 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

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

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) {
      userPaused.current = false;
      void v.play().catch(() => undefined);
    } else {
      userPaused.current = true;
      v.pause();
    }
  };

  const seekTo = (clientX: number) => {
    const v = video.current;
    const r = bar.current?.getBoundingClientRect();
    if (!v || !r || !v.duration) return;
    v.currentTime = Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * v.duration;
    setTime(v.currentTime);
  };
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    scrubbing.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    seekTo(e.clientX);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => scrubbing.current && seekTo(e.clientX);
  const onUp = () => (scrubbing.current = false);
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const v = video.current;
    if (!v) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      v.currentTime = Math.min(v.duration, Math.max(0, v.currentTime + (e.key === "ArrowRight" ? 1 : -1)));
      setTime(v.currentTime);
    }
  };

  const fullscreen = () => {
    const d = document as FsDoc;
    if (d.fullscreenElement ?? d.webkitFullscreenElement) {
      if (d.exitFullscreen) void d.exitFullscreen();
      else d.webkitExitFullscreen?.();
      return;
    }
    const el = wrap.current as FsEl | null;
    const v = video.current as IosVideo | null;
    if (el?.requestFullscreen) void el.requestFullscreen().catch(() => undefined);
    else if (el?.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else v?.webkitEnterFullscreen?.(); // iPhone : seul le lecteur natif passe en plein écran.
  };

  const btn = "grid h-10 w-10 shrink-0 place-items-center rounded-full text-white transition-colors hover:bg-white/15 active:bg-white/25";
  return (
    <div ref={wrap} className="group/video relative overflow-hidden rounded-[28px] bg-[#e9e4da] shadow-[0_40px_80px_-40px_rgba(23,23,23,.5)] [&:fullscreen]:rounded-none [&:fullscreen]:bg-black">
      <video
        ref={video}
        className={`block aspect-[4/5] max-h-[calc(100svh-170px)] w-full object-cover object-[56%_50%] sm:aspect-[16/11] ${full ? "!aspect-auto !h-full !max-h-none object-contain" : ""}`}
        src={film.src}
        poster={film.poster}
        muted
        loop
        playsInline
        preload="auto"
        aria-label="Film de présentation : photographier sa fiche, l'imprimer au bon niveau, la journée du matin, le bilan du soir, le programme et la bibliothèque"
        onClick={toggle}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => {
          setTime(e.currentTarget.currentTime);
          paint();
        }}
        onSeeked={paint}
      />
      <div className="absolute inset-x-3 bottom-3 flex items-center gap-1.5 rounded-full bg-[#171717]/55 p-1.5 pr-2 opacity-100 backdrop-blur-md transition-opacity duration-300 sm:inset-x-4 sm:bottom-4 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/video:opacity-100 [@media(hover:hover)]:group-focus-within/video:opacity-100 data-[paused=true]:!opacity-100" data-paused={!playing}>
        <button type="button" onClick={toggle} aria-label={playing ? "Mettre en pause" : "Lire la vidéo"} className={btn}>
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
        <button type="button" onClick={fullscreen} aria-label={full ? "Quitter le plein écran" : "Plein écran"} className={btn}>
          {full ? <Minimize size={17} /> : <Maximize size={17} />}
        </button>
      </div>
    </div>
  );
}
