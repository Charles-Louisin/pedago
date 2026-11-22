// Encode le clip Veo du héros en WebM (VP9) pour le site, image par image, en greffant l'écran net de
// l'image clé une fois le téléphone posé (même calage que export-seq2.cjs).
// node export-video.cjs <dossier ref> <sortie.webm> <poster.webp> [largeur] [crf]
const { createRequire } = require("module");
const req = createRequire("C:/realProject/pedago/pedago-admin/package.json");
const { chromium } = req("playwright-core");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");

const [DIR, OUT, POSTER, wArg, crfArg] = process.argv.slice(2);
const OW = Number(wArg ?? 1600);
const OH = Math.round((OW * 9) / 16);
const CRF = String(crfArg ?? 33);
const FPS = 24;
const FFMPEG = path.join(process.env.LOCALAPPDATA, "ms-playwright", "ffmpeg-1013", "ffmpeg-win64.exe");
const PHONE = [[928, 124], [1149, 152], [1053, 628], [842, 585]];
const SCREEN = [[960, 170], [1110, 185], [1030, 570], [882, 548]];

(async () => {
  const server = http.createServer((q, r) => {
    const f = path.join(DIR, path.basename(decodeURIComponent(q.url.split("?")[0])) || "frames.html");
    if (!fs.existsSync(f)) return r.writeHead(404).end();
    const type = f.endsWith(".mp4") ? "video/mp4" : f.endsWith(".jpg") ? "image/jpeg" : "text/html";
    const size = fs.statSync(f).size;
    const range = q.headers.range && /bytes=(\d+)-(\d*)/.exec(q.headers.range);
    if (range) {
      const a = Number(range[1]);
      const b = range[2] ? Number(range[2]) : size - 1;
      r.writeHead(206, { "Content-Type": type, "Content-Range": `bytes ${a}-${b}/${size}`, "Accept-Ranges": "bytes", "Content-Length": b - a + 1 });
      return fs.createReadStream(f, { start: a, end: b }).pipe(r);
    }
    r.writeHead(200, { "Content-Type": type, "Content-Length": size, "Accept-Ranges": "bytes" });
    fs.createReadStream(f).pipe(r);
  });
  await new Promise((res) => server.listen(0, "127.0.0.1", res));
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/frames.html`);
  const duration = await page.evaluate(
    async ({ PHONE, SCREEN }) => {
      const v = document.getElementById("v");
      v.src = "hero.mp4";
      await new Promise((r, j) => {
        v.onloadeddata = r;
        v.onerror = () => j(new Error("lecture impossible"));
      });
      const key = new Image();
      key.src = "key.jpg";
      await key.decode();
      const W = 1920;
      const H = 1080;
      const kc = document.createElement("canvas");
      kc.width = W;
      kc.height = H;
      const kg = kc.getContext("2d", { willReadFrequently: true });
      kg.drawImage(key, 0, 0, W, H);
      const kd = kg.getImageData(0, 0, W, H).data;
      const luma = (d, o) => 0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2];
      const inPoly = (x, y, P) => {
        let ins = false;
        for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
          const [xi, yi] = P[i];
          const [xj, yj] = P[j];
          if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
        }
        return ins;
      };
      const xs = PHONE.map((p) => p[0]);
      const ys = PHONE.map((p) => p[1]);
      const box = [Math.min(...xs) - 20, Math.min(...ys) - 20, Math.max(...xs) + 20, Math.max(...ys) + 20];
      const samples = [];
      for (let y = box[1]; y < box[3]; y += 3) for (let x = box[0]; x < box[2]; x += 3) samples.push([x, y, luma(kd, (y * W + x) * 4)]);
      const screenPx = [];
      for (let y = box[1]; y < box[3]; y += 4) for (let x = box[0]; x < box[2]; x += 4) if (inPoly(x, y, SCREEN)) screenPx.push([x, y]);
      const mask = document.createElement("canvas");
      mask.width = W;
      mask.height = H;
      const mg = mask.getContext("2d");
      mg.filter = "blur(5px)";
      mg.beginPath();
      PHONE.forEach(([x, y], k) => (k ? mg.lineTo(x, y) : mg.moveTo(x, y)));
      mg.closePath();
      mg.fillStyle = "#fff";
      mg.fill();
      mg.filter = "none";
      mg.globalCompositeOperation = "source-in";
      mg.drawImage(kc, 0, 0);
      window.__fix = { mask, samples, screenPx, W, H, luma };
      return v.duration;
    },
    { PHONE, SCREEN }
  );

  const frames = Math.floor(duration * FPS);
  const ff = spawn(FFMPEG, ["-hide_banner", "-loglevel", "error", "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", String(FPS), "-i", "pipe:0", "-c:v", "libvpx-vp9", "-crf", CRF, "-b:v", "0", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", "-pix_fmt", "yuv420p", "-an", "-y", OUT], { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((res, rej) => ff.on("close", (c) => (c === 0 ? res() : rej(new Error("ffmpeg " + c)))));

  for (let i = 0; i < frames; i++) {
    const t = Math.min(duration - 0.01, (i + 0.5) / FPS);
    const out = await page.evaluate(
      async ({ t, OW, OH, poster }) => {
        const { mask, samples, screenPx, W, H, luma } = window.__fix;
        const v = document.getElementById("v");
        v.currentTime = t;
        await new Promise((r) => (v.onseeked = r));
        const c = document.createElement("canvas");
        c.width = W;
        c.height = H;
        const g = c.getContext("2d", { willReadFrequently: true });
        g.drawImage(v, 0, 0, W, H);
        if (t > 4.4) {
          const d = g.getImageData(0, 0, W, H).data;
          let best = [0, 0, Infinity];
          for (let dy = -14; dy <= 14; dy += 2) {
            for (let dx = -14; dx <= 14; dx += 2) {
              let s = 0;
              for (let k = 0; k < samples.length; k += 2) {
                const [x, y, l] = samples[k];
                s += Math.abs(luma(d, ((y + dy) * W + x + dx) * 4) - l);
              }
              if (s < best[2]) best = [dx, dy, s];
            }
          }
          let fine = [best[0], best[1], Infinity];
          for (let dy = best[1] - 1; dy <= best[1] + 1; dy++) {
            for (let dx = best[0] - 1; dx <= best[0] + 1; dx++) {
              let s = 0;
              for (const [x, y, l] of samples) s += Math.abs(luma(d, ((y + dy) * W + x + dx) * 4) - l);
              if (s < fine[2]) fine = [dx, dy, s];
            }
          }
          const err = fine[2] / samples.length;
          let m = 0;
          for (const [x, y] of screenPx) m += luma(d, ((y + fine[1]) * W + x + fine[0]) * 4);
          m /= screenPx.length;
          const alpha = err < 38 ? Math.min(1, Math.max(0, (m - 90) / (190 - 90))) : 0;
          if (alpha > 0) {
            g.globalAlpha = alpha;
            g.drawImage(mask, fine[0], fine[1]);
            g.globalAlpha = 1;
          }
        }
        const o = document.createElement("canvas");
        o.width = OW;
        o.height = OH;
        const og = o.getContext("2d");
        og.imageSmoothingQuality = "high";
        og.drawImage(c, 0, 0, OW, OH);
        return { jpg: o.toDataURL("image/jpeg", 0.95), webp: poster ? o.toDataURL("image/webp", 0.8) : null };
      },
      { t, OW, OH, poster: i === 0 }
    );
    if (out.webp) fs.writeFileSync(POSTER, Buffer.from(out.webp.split(",")[1], "base64"));
    const buf = Buffer.from(out.jpg.split(",")[1], "base64");
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  }
  ff.stdin.end();
  await done;
  await browser.close();
  server.close();
  console.log(JSON.stringify({ frames, duration, kb: Math.round(fs.statSync(OUT).size / 1024), posterKb: Math.round(fs.statSync(POSTER).size / 1024) }));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
