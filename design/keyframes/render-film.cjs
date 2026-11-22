// Film de présentation PEDAGO (≈ 70 s) : clip Veo → six chapitres expliqués avec les vrais enregistrements
// de l'app → carton final → clip Veo à l'envers, qui finit sur la toute première image (boucle parfaite).
// Rendu dans la page du site (mêmes polices, mêmes fichiers), deux formats : ordinateur 16:9 et téléphone 4:5.
// node render-film.cjs <url du site> <sortie ordi.webm> <sortie tel.webm> <poster ordi.webp> <poster tel.webp>
const { createRequire } = require("module");
const req = createRequire("C:/realProject/pedago/pedago-admin/package.json");
const { chromium } = req("playwright-core");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const [SITE, OUT_D, OUT_M, POSTER_D, POSTER_M, onlyArg] = process.argv.slice(2);
const FPS = 24;
const FFMPEG = path.join(process.env.LOCALAPPDATA, "ms-playwright", "ffmpeg-1013", "ffmpeg-win64.exe");
const X = 0.6; // durée des fondus enchaînés

const CHAPTERS = [
  { video: "fiche", segs: [[0.05, 8.8]], hold: 0, title: ["Photographie", "ta fiche."], text: "PEDAGO la remet au propre, à l’identique : cartouche, objectif, déroulement, exercices." },
  { video: "fiche", segs: [[8.9, 11.8]], hold: 1.8, title: ["Imprime-la", "au bon niveau."], text: "Facile, standard ou approfondi, avec ou sans corrigés. En PDF ou en Word." },
  { video: "journee", segs: [[0.05, 7.9]], hold: 0, title: ["Chaque matin,", "ta journée est prête."], text: "La leçon en cours, la suivante et toute la semaine, d’après ton emploi du temps." },
  { video: "bilan", segs: [[0.05, 8.05]], hold: 0, title: ["Le soir,", "fais le bilan."], text: "Faite, partielle ou pas faite : trente secondes, et ton programme se recale tout seul." },
  { video: "programme", segs: [[0.05, 9.7]], hold: 0.4, title: ["Ton programme,", "toujours à jour."], text: "Par semaine ou sur toute l’année, filtré par matière." },
  { video: "bibliotheque", segs: [[0.05, 2.4], [6.9, 9.6], [33.8, 41.6]], hold: 0.6, title: ["La bibliothèque", "de ta classe."], text: "Des fiches et des exercices prêts à imprimer, à télécharger pour t’en servir sans réseau." },
];

// Chronologie : chaque scène commence X secondes avant la fin de la précédente.
const scenes = [];
let t = 0;
const push = (s) => {
  const start = scenes.length ? t - X : 0;
  scenes.push({ ...s, start, end: start + s.dur });
  t = start + s.dur;
};
push({ kind: "hero", dur: 8, reverse: false });
CHAPTERS.forEach((c, i) => {
  const len = c.segs.reduce((a, [s, e]) => a + (e - s), 0) + c.hold;
  push({ kind: "chapter", index: i, dur: len + X, ...c });
});
push({ kind: "end", dur: 3.6 });
push({ kind: "hero", dur: 8, reverse: true });
const TOTAL = t;

(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(SITE);
  await page.evaluate(
    async ({ CHAPTERS }) => {
      await Promise.all([document.fonts.load('600 64px "Plus Jakarta Sans"'), document.fonts.load('700 64px "Plus Jakarta Sans"'), document.fonts.load('400 26px "Inter"'), document.fonts.load('600 26px "Inter"')]);
      const load = async (src) => {
        const v = document.createElement("video");
        v.muted = true;
        v.preload = "auto";
        v.src = src;
        await new Promise((r, j) => {
          v.oncanplaythrough = r;
          v.onerror = () => j(new Error("lecture " + src));
        });
        return v;
      };
      const vids = { hero: await load("/site/hero.webm") };
      for (const c of CHAPTERS) if (!vids[c.video]) vids[c.video] = await load(`/site/videos/${c.video}.webm`);
      const seek = async (v, time) => {
        time = Math.max(0, Math.min(v.duration - 0.02, time));
        if (Math.abs(v.currentTime - time) < 0.001 && v.readyState >= 2) return;
        v.currentTime = time;
        await new Promise((r) => (v.onseeked = r));
      };
      window.__film = { vids, seek };
    },
    { CHAPTERS }
  );

  const formats = [
    { key: "d", w: 1600, h: 900, out: OUT_D, poster: POSTER_D },
    { key: "m", w: 720, h: 900, out: OUT_M, poster: POSTER_M },
  ].filter((f) => !onlyArg || onlyArg.includes(f.key));
  const procs = {};
  for (const f of formats) {
    const p = spawn(FFMPEG, ["-hide_banner", "-loglevel", "error", "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", String(FPS), "-i", "pipe:0", "-c:v", "libvpx-vp9", "-crf", f.key === "d" ? "33" : "32", "-b:v", "0", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", "-g", "48", "-pix_fmt", "yuv420p", "-an", "-y", f.out], { stdio: ["pipe", "inherit", "inherit"] });
    procs[f.key] = { p, done: new Promise((res, rej) => p.on("close", (c) => (c === 0 ? res() : rej(new Error("ffmpeg " + c))))) };
  }

  const frames = Math.round(TOTAL * FPS);
  console.log(`durée ${TOTAL.toFixed(1)} s · ${frames} images`);
  for (let i = 0; i < frames; i++) {
    const time = i / FPS;
    const out = await page.evaluate(
      async ({ time, scenes, formats, X, poster }) => {
        const { vids, seek } = window.__film;
        const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
        const active = scenes.filter((s) => time >= s.start && time < s.end + 1e-6);
        // Temps source d'un chapitre : segments mis bout à bout, puis arrêt sur image.
        const chapterSource = (s, local) => {
          let acc = 0;
          for (const [a, b] of s.segs) {
            if (local < acc + (b - a)) return a + (local - acc);
            acc += b - a;
          }
          const [, last] = s.segs[s.segs.length - 1];
          return last;
        };
        // Préparer les images vidéo nécessaires (une seule recherche par vidéo et par image).
        const frameOf = {};
        for (const s of active) {
          const local = time - s.start;
          if (s.kind === "hero") {
            const v = vids.hero;
            const tt = s.reverse ? v.duration - 0.02 - Math.min(local, s.dur) * ((v.duration - 0.04) / s.dur) : Math.min(local, s.dur) * ((v.duration - 0.04) / s.dur);
            await seek(v, tt);
            const c = document.createElement("canvas");
            c.width = v.videoWidth;
            c.height = v.videoHeight;
            c.getContext("2d").drawImage(v, 0, 0);
            frameOf[s.start] = c;
          } else if (s.kind === "chapter") {
            const v = vids[s.video];
            await seek(v, chapterSource(s, Math.max(0, local - X * 0.5)));
            const c = document.createElement("canvas");
            c.width = v.videoWidth;
            c.height = v.videoHeight;
            c.getContext("2d").drawImage(v, 0, 0);
            frameOf[s.start] = c;
          }
        }

        const INK = "#171717";
        const GREEN = "#1F7A4D";
        const rr = (g, x, y, w, h, r) => {
          g.beginPath();
          g.roundRect(x, y, w, h, r);
        };
        const wrap = (g, text, maxW) => {
          const words = text.split(" ");
          const lines = [];
          let line = "";
          for (const w of words) {
            const tryL = line ? line + " " + w : w;
            if (g.measureText(tryL).width > maxW && line) {
              lines.push(line);
              line = w;
            } else line = tryL;
          }
          if (line) lines.push(line);
          return lines;
        };
        const paper = (g, W, H) => {
          g.fillStyle = "#fafaf7";
          g.fillRect(0, 0, W, H);
          const rg = g.createRadialGradient(W * 0.82, H * 0.1, 0, W * 0.82, H * 0.1, Math.max(W, H) * 0.7);
          rg.addColorStop(0, "rgba(31,122,77,0.16)");
          rg.addColorStop(1, "rgba(31,122,77,0)");
          g.fillStyle = rg;
          g.fillRect(0, 0, W, H);
        };
        const mark = (g, x, y, s) => {
          const k = s / 40;
          g.fillStyle = INK;
          rr(g, x + 2 * k, y + 2 * k, 17 * k, 17 * k, 5 * k);
          g.fill();
          g.globalAlpha *= 0.72;
          rr(g, x + 2 * k, y + 21 * k, 17 * k, 17 * k, 5 * k);
          g.fill();
          g.globalAlpha /= 0.72;
          g.fillStyle = GREEN;
          g.beginPath();
          g.moveTo(x + 21 * k, y + 2 * k);
          g.lineTo(x + 25.5 * k, y + 2 * k);
          g.arc(x + 25.5 * k, y + 14.5 * k, 12.5 * k, -Math.PI / 2, Math.PI / 2);
          g.lineTo(x + 21 * k, y + 27 * k);
          g.closePath();
          g.fill();
        };
        const wordmark = (g, x, y, s) => {
          mark(g, x, y, s);
          g.fillStyle = INK;
          g.font = `600 ${Math.round(s * 0.72)}px "Plus Jakarta Sans"`;
          g.textBaseline = "middle";
          g.fillText("pedago", x + s * 1.22, y + s * 0.52);
        };
        const phone = (g, img, cx, top, h) => {
          const sw = (h * 390) / 844;
          const pad = h * 0.022;
          const W = sw + pad * 2;
          const Hh = h + pad * 2;
          const x = cx - W / 2;
          const y = top;
          g.save();
          g.shadowColor = "rgba(0,0,0,0.35)";
          g.shadowBlur = h * 0.09;
          g.shadowOffsetY = h * 0.05;
          const lg = g.createLinearGradient(x, y, x + W, y + Hh);
          lg.addColorStop(0, "#2b2d30");
          lg.addColorStop(0.55, "#0e0f10");
          lg.addColorStop(1, "#3a3c40");
          g.fillStyle = lg;
          rr(g, x, y, W, Hh, h * 0.075);
          g.fill();
          g.restore();
          g.save();
          rr(g, x + pad, y + pad, sw, h, h * 0.058);
          g.clip();
          g.fillStyle = "#fff";
          g.fillRect(x + pad, y + pad, sw, h);
          if (img) g.drawImage(img, x + pad, y + pad, sw, h);
          g.restore();
        };
        const progress = (g, x, y, w, idx, local, dur) => {
          const n = 6;
          const gap = 8;
          const bw = (w - gap * (n - 1)) / n;
          for (let k = 0; k < n; k++) {
            g.fillStyle = "rgba(23,23,23,0.12)";
            rr(g, x + k * (bw + gap), y, bw, 4, 2);
            g.fill();
            const f = k < idx ? 1 : k === idx ? Math.min(1, local / dur) : 0;
            if (f > 0) {
              g.fillStyle = GREEN;
              rr(g, x + k * (bw + gap), y, bw * f, 4, 2);
              g.fill();
            }
          }
        };

        const drawScene = (g, W, H, s, fmt) => {
          const local = time - s.start;
          const mobile = fmt === "m";
          if (s.kind === "hero") {
            const src = frameOf[s.start];
            // Plein cadre (recadrage centré sur le téléphone pour le format portrait).
            const sc = Math.max(W / src.width, H / src.height);
            const dw = src.width * sc;
            const dh = src.height * sc;
            const dx = Math.min(0, Math.max(W - dw, W / 2 - dw * 0.56));
            // Fin du clip d'ouverture : léger zoom vers le téléphone avant le premier chapitre.
            let z = 1;
            if (!s.reverse && local > s.dur - X - 0.4) z = 1 + 0.06 * ease((local - (s.dur - X - 0.4)) / (X + 0.4));
            if (s.reverse && local < X + 0.4) z = 1 + 0.06 * (1 - ease(local / (X + 0.4)));
            g.save();
            g.translate(W * 0.56, H * 0.45);
            g.scale(z, z);
            g.translate(-W * 0.56, -H * 0.45);
            g.drawImage(src, dx, (H - dh) / 2, dw, dh);
            g.restore();
            return;
          }
          paper(g, W, H);
          if (s.kind === "end") {
            const a = ease(local / 0.8);
            g.globalAlpha = a;
            const ms = mobile ? 84 : 96;
            mark(g, W / 2 - ms / 2, H * (mobile ? 0.25 : 0.2), ms);
            g.textAlign = "center";
            g.textBaseline = "alphabetic";
            g.fillStyle = INK;
            const fs1 = mobile ? 54 : 76;
            g.font = `600 ${fs1}px "Plus Jakarta Sans"`;
            const y0 = H * (mobile ? 0.5 : 0.47) + (1 - a) * 18;
            g.fillText("Prépare ta classe", W / 2, y0);
            g.fillStyle = GREEN;
            g.fillText("en une photo.", W / 2, y0 + fs1 * 1.08);
            g.fillStyle = "#4a4a4a";
            g.font = `400 ${mobile ? 24 : 28}px "Inter"`;
            g.fillText("Gratuit · Android · Fonctionne sans réseau", W / 2, y0 + fs1 * 1.08 + (mobile ? 64 : 72));
            g.textAlign = "left";
            g.globalAlpha = 1;
            return;
          }
          // Chapitre
          const img = frameOf[s.start];
          // Le texte sortant s'efface avant que le nouveau n'arrive : jamais deux titres superposés.
          const out = local > s.dur - X ? 1 - ease((local - (s.dur - X)) / (X * 0.45)) : 1;
          const textIn = ease((local - X * 0.5) / 0.6) * out;
          const bodyIn = ease((local - X * 0.5 - 0.15) / 0.6) * out;
          if (!mobile) {
            wordmark(g, 262, 64, 34);
            phone(g, img, 1150, 64, 724);
            const x = 262;
            progress(g, x, 300, 420, s.index, local, s.dur);
            g.fillStyle = INK;
            g.font = '600 62px "Plus Jakarta Sans"';
            g.textBaseline = "alphabetic";
            g.globalAlpha = textIn;
            const ty = 400 + (1 - textIn) * 22;
            g.fillText(s.title[0], x, ty);
            g.fillStyle = GREEN;
            g.fillText(s.title[1], x, ty + 68);
            g.globalAlpha = bodyIn;
            g.fillStyle = "#4a4a4a";
            g.font = '400 27px "Inter"';
            wrap(g, s.text, 560).forEach((l, k) => g.fillText(l, x, ty + 140 + k * 41 + (1 - bodyIn) * 14));
            g.globalAlpha = 1;
          } else {
            const x = 48;
            progress(g, x, 50, W - 96, s.index, local, s.dur);
            g.fillStyle = INK;
            g.font = '600 46px "Plus Jakarta Sans"';
            g.textBaseline = "alphabetic";
            g.globalAlpha = textIn;
            const ty = 120 + (1 - textIn) * 18;
            g.fillText(s.title[0], x, ty);
            g.fillStyle = GREEN;
            g.fillText(s.title[1], x, ty + 52);
            g.globalAlpha = bodyIn;
            g.fillStyle = "#4a4a4a";
            g.font = '400 23px "Inter"';
            const lines = wrap(g, s.text, W - 96);
            lines.forEach((l, k) => g.fillText(l, x, ty + 100 + k * 33 + (1 - bodyIn) * 12));
            g.globalAlpha = 1;
            const top = ty + 100 + lines.length * 33 + 10;
            phone(g, img, W / 2, top, H - 96 - top);
          }
        };

        const res = {};
        for (const f of formats) {
          const c = document.createElement("canvas");
          c.width = f.w;
          c.height = f.h;
          const g = c.getContext("2d");
          g.imageSmoothingQuality = "high";
          active.forEach((s, k) => {
            const local = time - s.start;
            // Fondu entrant pour toute scène qui chevauche la précédente.
            g.globalAlpha = k > 0 ? ease(local / X) : 1;
            const off = document.createElement("canvas");
            off.width = f.w;
            off.height = f.h;
            const og = off.getContext("2d");
            og.imageSmoothingQuality = "high";
            drawScene(og, f.w, f.h, s, f.key);
            g.drawImage(off, 0, 0);
            g.globalAlpha = 1;
          });
          res[f.key] = { jpg: c.toDataURL("image/jpeg", 0.93), webp: poster ? c.toDataURL("image/webp", 0.82) : null };
        }
        return res;
      },
      { time, scenes, formats, X, poster: i === 0 }
    );
    for (const f of formats) {
      if (out[f.key].webp) fs.writeFileSync(f.poster, Buffer.from(out[f.key].webp.split(",")[1], "base64"));
      const buf = Buffer.from(out[f.key].jpg.split(",")[1], "base64");
      const p = procs[f.key].p;
      if (!p.stdin.write(buf)) await new Promise((r) => p.stdin.once("drain", r));
    }
    if (i % 240 === 0) console.log(`${i}/${frames}`);
  }
  for (const f of formats) procs[f.key].p.stdin.end();
  await Promise.all(formats.map((f) => procs[f.key].done));
  await browser.close();
  console.log(JSON.stringify(Object.fromEntries(formats.map((f) => [f.key, Math.round(fs.statSync(f.out).size / 1024) + " Ko"]))));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
